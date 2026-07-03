import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const DEFAULT_DATABASE = "makeshift-dev";
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
const sql = `
INSERT INTO forum_post_subscriptions (
  post_id,
  user_id,
  muted_at,
  created_at,
  updated_at
)
SELECT
  forum_posts.id,
  forum_posts.author_id,
  NULL,
  forum_posts.created_at,
  unixepoch() * 1000
FROM forum_posts
WHERE forum_posts.status = 'published'
ON CONFLICT(post_id, user_id) DO NOTHING;
`;

const result = spawnSync(
  process.execPath,
  [
    wranglerBin,
    "d1",
    "execute",
    database,
    args.remote ? "--remote" : "--local",
    "--command",
    sql,
  ],
  { stdio: "inherit" },
);
if (result.error) console.error(result.error);
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

function fail(message) {
  console.error(message);
  printHelp();
  process.exit(1);
}

function printHelp() {
  console.log(`
用法：
  pnpm forum:subscriptions:backfill-authors -- --remote
  pnpm forum:subscriptions:backfill-authors -- --local

说明：
  - 只给已发布帖子补齐「作者关注自己的帖子」
  - 已存在订阅记录时不覆盖，因此不会重新开启用户已经取消关注的帖子
`);
}
