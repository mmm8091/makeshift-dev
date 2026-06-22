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

const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const result = spawnSync(pnpm, wranglerArgs, {
  stdio: "inherit",
  shell: process.platform === "win32",
});
if (result.error) {
  console.error(result.error);
}
process.exit(result.status ?? 1);

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
