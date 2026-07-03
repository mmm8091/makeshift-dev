import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import {
  formatFindings,
  lintMarkdownFile,
} from "./lint-course-markdown.mjs";

const DEFAULT_DATABASE = "makeshift-dev";
const DEFAULT_ENTITLEMENT = "course:full";
const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const COURSE_DISCUSSION_TAG = {
  id: "tag-course-discussion",
  slug: "course-discussion",
  name: "课程讨论",
};
const COURSE_DISCUSSION_BODY =
  "这是系统自动创建的课程讨论帖。这里可以放顺利、难懂、卡住和补充说明；请不要粘贴 token、卡密、邮箱、手机号或其他秘密。";

const args = parseArgs(process.argv.slice(2));

if (args.help || !args.file || !args.slug || !args.title || !args.order) {
  printHelp();
  process.exit(args.help ? 0 : 1);
}

if (!args.remote && !args.local) {
  fail("请显式传入 --remote 或 --local，避免把课程正文写错环境");
}

const visibility = args.visibility || "locked";
if (!["public", "locked"].includes(visibility)) {
  fail("--visibility 只能是 public 或 locked");
}

const status = args.status || "published";
if (!["draft", "published"].includes(status)) {
  fail("--status 只能是 draft 或 published");
}

const order = Number(args.order);
if (!Number.isInteger(order)) {
  fail("--order 必须是整数");
}

if (!/^[a-z0-9-]+$/i.test(args.slug)) {
  fail("--slug 只能包含字母、数字和连字符");
}

const filePath = resolve(args.file);
const lintFindings = lintMarkdownFile(filePath);
if (lintFindings.length > 0) {
  console.error(formatFindings(lintFindings));
  process.exit(1);
}

const body = readFileSync(filePath, "utf8");
const now = Date.now();
const requiredEntitlement =
  visibility === "locked"
    ? args["required-entitlement"] || DEFAULT_ENTITLEMENT
    : args["required-entitlement"] || null;
const systemUserId = process.env.SYSTEM_USER_ID?.trim() || "";
if (status === "published") {
  if (!systemUserId) {
    fail("发布课程需要设置 SYSTEM_USER_ID，用来自动维护课程讨论帖");
  }
  assertSystemUser(systemUserId);
}

const sql = `
INSERT INTO course_sections (
  id,
  slug,
  title,
  summary,
  body_md,
  status,
  visibility,
  required_entitlement,
  order_index,
  published_at,
  created_at,
  updated_at
) VALUES (
  ${sqlString(randomUUID())},
  ${sqlString(args.slug)},
  ${sqlString(args.title)},
  ${sqlString(args.summary || "")},
  ${sqlString(body)},
  ${sqlString(status)},
  ${sqlString(visibility)},
  ${sqlValue(requiredEntitlement)},
  ${order},
  ${status === "published" ? now : "NULL"},
  ${now},
  ${now}
)
ON CONFLICT(slug) DO UPDATE SET
  title = excluded.title,
  summary = excluded.summary,
  body_md = excluded.body_md,
  status = excluded.status,
  visibility = excluded.visibility,
  required_entitlement = excluded.required_entitlement,
  order_index = excluded.order_index,
  published_at = excluded.published_at,
  updated_at = excluded.updated_at;

${discussionSql({
  status,
  slug: args.slug,
  title: args.title,
  systemUserId,
  now,
})}
`;

const tmpFile = resolve("tmp", `import-course-section-${args.slug}.sql`);
mkdirSync(dirname(tmpFile), { recursive: true });
writeFileSync(tmpFile, sql, "utf8");

const wranglerArgs = [
  "wrangler",
  "d1",
  "execute",
  args.database || DEFAULT_DATABASE,
  args.remote ? "--remote" : "--local",
  "--file",
  tmpFile,
];

const result = spawnSync(pnpm, wranglerArgs, {
  stdio: "inherit",
  shell: process.platform === "win32",
});
if (result.error) {
  console.error(result.error);
}
process.exit(result.status ?? 1);

function assertSystemUser(systemUserId) {
  const checkSql = [
    "SELECT profiles.user_id AS user_id",
    "FROM profiles",
    "WHERE profiles.user_id =",
    sqlString(systemUserId),
    "AND profiles.role = 'admin'",
    "LIMIT 1",
  ].join(" ");
  const result = spawnSync(
    pnpm,
    [
      "wrangler",
      "d1",
      "execute",
      args.database || DEFAULT_DATABASE,
      args.remote ? "--remote" : "--local",
      "--command",
      checkSql,
      "--json",
    ],
    {
      encoding: "utf8",
      shell: process.platform === "win32",
    },
  );
  if (result.error) {
    console.error(result.error);
    process.exit(1);
  }
  if (result.status !== 0) {
    process.stdout.write(result.stdout || "");
    process.stderr.write(result.stderr || "");
    fail("检查 SYSTEM_USER_ID 失败");
  }
  const payload = parseWranglerJson(result.stdout);
  const rows = payload?.[0]?.results ?? [];
  if (rows.length === 0) {
    fail("SYSTEM_USER_ID 必须指向一个 admin profile；课程讨论帖不会冒用学员账号");
  }
}

function parseWranglerJson(output) {
  const jsonStart = output.indexOf("[");
  if (jsonStart < 0) return null;
  try {
    return JSON.parse(output.slice(jsonStart));
  } catch {
    return null;
  }
}

function discussionSql({ status, slug, title, systemUserId, now }) {
  const discussionTitle = `课程讨论：${title}`;
  if (status !== "published") {
    return `
UPDATE forum_posts
SET status = 'hidden', updated_at = ${now}
WHERE id IN (
  SELECT forum_post_id FROM course_discussion_threads
  WHERE section_slug = ${sqlString(slug)}
);
`;
  }

  const postId = randomUUID();
  const postSlug = `course-discussion-${slug}`;
  return `
INSERT INTO forum_tags (id, slug, name, hidden_at)
VALUES (
  ${sqlString(COURSE_DISCUSSION_TAG.id)},
  ${sqlString(COURSE_DISCUSSION_TAG.slug)},
  ${sqlString(COURSE_DISCUSSION_TAG.name)},
  NULL
)
ON CONFLICT(slug) DO NOTHING;

INSERT INTO forum_posts (
  id,
  slug,
  author_id,
  title,
  body_md,
  status,
  pinned_at,
  last_activity_at,
  created_at,
  updated_at
)
SELECT
  ${sqlString(postId)},
  ${sqlString(postSlug)},
  ${sqlString(systemUserId)},
  ${sqlString(discussionTitle)},
  ${sqlString(COURSE_DISCUSSION_BODY)},
  'published',
  NULL,
  ${now},
  ${now},
  ${now}
WHERE NOT EXISTS (
  SELECT 1 FROM course_discussion_threads
  WHERE section_slug = ${sqlString(slug)}
);

INSERT INTO course_discussion_threads (
  section_slug,
  forum_post_id,
  created_by,
  created_at,
  updated_at
)
SELECT
  ${sqlString(slug)},
  ${sqlString(postId)},
  ${sqlString(systemUserId)},
  ${now},
  ${now}
WHERE NOT EXISTS (
  SELECT 1 FROM course_discussion_threads
  WHERE section_slug = ${sqlString(slug)}
);

UPDATE forum_posts
SET
  title = ${sqlString(discussionTitle)},
  body_md = ${sqlString(COURSE_DISCUSSION_BODY)},
  status = 'published',
  updated_at = ${now}
WHERE id IN (
  SELECT forum_post_id FROM course_discussion_threads
  WHERE section_slug = ${sqlString(slug)}
);

INSERT INTO forum_post_tags (post_id, tag_id)
SELECT forum_post_id, ${sqlString(COURSE_DISCUSSION_TAG.id)}
FROM course_discussion_threads
WHERE section_slug = ${sqlString(slug)}
ON CONFLICT(post_id, tag_id) DO NOTHING;
`;
}

function parseArgs(items) {
  const result = {};
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    if (!item.startsWith("--")) continue;
    const key = item.slice(2);
    const next = items[index + 1];
    if (!next || next.startsWith("--")) {
      result[key] = true;
    } else {
      result[key] = next;
      index += 1;
    }
  }
  return result;
}

function sqlValue(value) {
  return value === null || value === undefined ? "NULL" : sqlString(value);
}

function sqlString(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function fail(message) {
  console.error(message);
  printHelp();
  process.exit(1);
}

function printHelp() {
  console.log(`
用法：
  pnpm course:import -- --remote --file "课程文档/1.1：意图驱动开发.md" \\
    --slug 1-1-intent-driven-development \\
    --title "1.1：意图驱动开发" \\
    --summary "把原始意志锤成可以交给 AI 执行、验证和修正的工程意图" \\
    --order 2 \\
    --visibility locked \\
    --required-entitlement course:full

说明：
  - locked 正文请放在被 .gitignore 忽略的 课程文档/ 下
  - public 正文优先放 content/courses/ 并走 Git
  - 脚本会按 slug upsert course_sections.body_md
`);
}
