import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";

const DEFAULT_DATABASE = "makeshift-dev";
const COURSE_DISCUSSION_TAG = {
  id: "tag-course-discussion",
  slug: "course-discussion",
  name: "课程讨论",
};
const COURSE_DISCUSSION_BODY =
  "这是系统自动创建的课程讨论帖。这里可以放顺利、难懂、卡住和补充说明；请不要粘贴 token、卡密、邮箱、手机号或其他秘密。";
const STATIC_REPO_COURSES = [
  {
    slug: "preface",
    title: "前言：平民编程与创造的时代",
  },
  {
    slug: "01-will",
    title: "第一讲：树立一个意志",
  },
];
const require = createRequire(import.meta.url);
const wranglerBin = resolve(
  dirname(require.resolve("wrangler/package.json")),
  "bin",
  "wrangler.js",
);

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  printHelp();
  process.exit(0);
}
if (!args.remote && !args.local) {
  fail("请显式传入 --remote 或 --local，避免补错环境");
}

const database = args.database || DEFAULT_DATABASE;
const systemUserId = process.env.SYSTEM_USER_ID?.trim() || "";
if (!systemUserId) {
  fail("需要设置 SYSTEM_USER_ID，用来自动创建课程讨论帖");
}
assertSystemUser(systemUserId);

const courses = listPublishedCourses();
if (courses.length === 0) {
  console.log("没有已发布课程需要补齐");
  process.exit(0);
}

const now = Date.now();
const sql = [
  tagSql(),
  ...courses.map((course) => discussionSql({ ...course, systemUserId, now })),
].join("\n");

const tmpFile = resolve("tmp", `backfill-course-discussions-${now}.sql`);
mkdirSync(dirname(tmpFile), { recursive: true });
writeFileSync(tmpFile, sql, "utf8");

const result = spawnSync(
  process.execPath,
  [
    wranglerBin,
    "d1",
    "execute",
    database,
    args.remote ? "--remote" : "--local",
    "--file",
    tmpFile,
  ],
  { stdio: "inherit" },
);
if (result.error) console.error(result.error);
process.exit(result.status ?? 1);

function listPublishedCourses() {
  const output = executeJson(
    [
      "SELECT slug, title",
      "FROM course_sections",
      "WHERE status = 'published'",
      "ORDER BY order_index, slug",
    ].join(" "),
  );
  const dbCourses = (output?.[0]?.results ?? []).map((row) => ({
    slug: String(row.slug),
    title: String(row.title),
  }));
  const bySlug = new Map();
  for (const course of [...STATIC_REPO_COURSES, ...dbCourses]) {
    bySlug.set(course.slug, course);
  }
  return [...bySlug.values()];
}

function assertSystemUser(userId) {
  const output = executeJson(
    [
      "SELECT profiles.user_id AS user_id",
      "FROM profiles",
      "WHERE profiles.user_id =",
      sqlString(userId),
      "AND profiles.role = 'admin'",
      "LIMIT 1",
    ].join(" "),
  );
  if ((output?.[0]?.results ?? []).length === 0) {
    fail("SYSTEM_USER_ID 必须指向一个 admin profile；不会冒用学员账号");
  }
}

function executeJson(command) {
  const result = spawnSync(
    process.execPath,
    [
      wranglerBin,
      "d1",
      "execute",
      database,
      args.remote ? "--remote" : "--local",
      "--command",
      command,
      "--json",
    ],
    { encoding: "utf8" },
  );
  if (result.error) {
    console.error(result.error);
    process.exit(1);
  }
  if (result.status !== 0) {
    process.stdout.write(result.stdout || "");
    process.stderr.write(result.stderr || "");
    process.exit(result.status ?? 1);
  }

  const start = result.stdout.indexOf("[");
  if (start < 0) fail("Wrangler 没有返回 JSON");
  try {
    return JSON.parse(result.stdout.slice(start));
  } catch {
    fail("无法解析 Wrangler JSON 输出");
  }
}

function tagSql() {
  return `
INSERT INTO forum_tags (id, slug, name, hidden_at)
VALUES (
  ${sqlString(COURSE_DISCUSSION_TAG.id)},
  ${sqlString(COURSE_DISCUSSION_TAG.slug)},
  ${sqlString(COURSE_DISCUSSION_TAG.name)},
  NULL
)
ON CONFLICT(slug) DO NOTHING;
`;
}

function discussionSql({ slug, title, systemUserId, now }) {
  const postId = randomUUID();
  const postSlug = `course-discussion-${slug}`;
  const discussionTitle = `课程讨论：${title}`;
  return `
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
  SYSTEM_USER_ID=<admin-user-id> pnpm course:discussions:backfill -- --remote
  SYSTEM_USER_ID=<admin-user-id> pnpm course:discussions:backfill -- --local

说明：
  - 只扫描 course_sections 的已发布课程 slug/title
  - 不读取、不导出、不打印课程正文
  - 已存在讨论帖时只同步标题、系统引导和“课程讨论”标签
`);
}
