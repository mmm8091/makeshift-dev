import {
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
} from "node:fs";
import { extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_PATHS = ["content/courses", "课程文档"];

const RULES = [
  {
    code: "escaped-url",
    pattern:
      /https?:\/\/[^\s<>()（）\[\]{}"'\u4e00-\u9fff]*\\[^\s<>()（）\[\]{}"'\u4e00-\u9fff]*/g,
    message:
      "URL 里有反斜杠转义，Markdown 可能把后续正文吞进链接；改成显式 Markdown 链接。",
  },
  {
    code: "escaped-link-text",
    pattern: /\[[^\]\n]*\\[^\]\n]*\]\(https?:\/\/[^)\s]+?\)/g,
    message:
      "链接显示文字里有飞书式反斜杠转义；改成可读文字，例如 [GitHub](https://github.com)。",
  },
  {
    code: "bare-url-in-parens",
    pattern: /(?<!\])[（(]\s*https?:\/\/[^\s)）]+[)）]/g,
    message:
      "中文正文括号里放裸 URL 容易被 GFM 自动链接误判；改成显式 Markdown 链接。",
  },
  {
    code: "export-escaped-punctuation",
    pattern: /\\[._-]/g,
    message:
      "发现导出器留下的反斜杠转义；中文课程正文里通常应写成普通字符，数学变量请用 $...$ 包起来。",
  },
  {
    code: "fragile-bold-math",
    pattern: /\*\*[^*\n]+\*\*\s*\$[^$\n]+\$\s*\*\*[^*\n]+\*\*/g,
    message:
      "加粗标记紧贴行内公式时容易渲染失败；改成整句文字加粗，并把公式放在括号或普通文本里。",
  },
  {
    code: "course-heading-level",
    pattern: /^####\s+.+$/gm,
    message:
      "课程正文小节请使用二级标题 ##，这样页面会显示统一的斜杠标题样式。",
  },
];

export function lintMarkdownFile(filePath) {
  const absolutePath = resolve(filePath);
  return lintMarkdownText(readFileSync(absolutePath, "utf8"), absolutePath);
}

export function lintMarkdownText(markdown, filePath = "<input>") {
  const findings = [];

  for (const rule of RULES) {
    for (const match of markdown.matchAll(rule.pattern)) {
      findings.push({
        code: rule.code,
        filePath,
        ...lineColumnAt(markdown, match.index ?? 0),
        match: sanitizeMatch(match[0]),
        message: rule.message,
      });
    }
  }

  return findings.sort((a, b) => {
    if (a.filePath !== b.filePath) return a.filePath.localeCompare(b.filePath);
    if (a.line !== b.line) return a.line - b.line;
    if (a.column !== b.column) return a.column - b.column;
    return a.code.localeCompare(b.code);
  });
}

export function collectMarkdownFiles(paths = DEFAULT_PATHS) {
  const files = [];

  for (const item of paths) {
    const absolutePath = resolve(item);
    if (!existsSync(absolutePath)) continue;
    collectFromPath(absolutePath, files);
  }

  return files.sort((a, b) => a.localeCompare(b));
}

export function formatFindings(findings) {
  if (findings.length === 0) {
    return "课程 Markdown 检查通过。";
  }

  const lines = [`课程 Markdown 检查发现 ${findings.length} 个问题：`];
  for (const finding of findings) {
    lines.push(
      `${finding.filePath}:${finding.line}:${finding.column} [${finding.code}] ${finding.message}`,
    );
    lines.push(`  匹配: ${finding.match}`);
  }
  return lines.join("\n");
}

function collectFromPath(path, files) {
  const stat = statSync(path);
  if (stat.isFile()) {
    if (extname(path).toLowerCase() === ".md") {
      files.push(path);
    }
    return;
  }

  if (!stat.isDirectory()) return;
  for (const entry of readdirSync(path)) {
    collectFromPath(resolve(path, entry), files);
  }
}

function lineColumnAt(text, index) {
  let line = 1;
  let column = 1;

  for (let cursor = 0; cursor < index; cursor += 1) {
    if (text[cursor] === "\n") {
      line += 1;
      column = 1;
    } else {
      column += 1;
    }
  }

  return { line, column };
}

function sanitizeMatch(value) {
  const collapsed = value.replace(/\s+/g, " ");
  return collapsed.length <= 120 ? collapsed : `${collapsed.slice(0, 117)}...`;
}

function parseArgs(items) {
  const result = { paths: [], quiet: false };

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    if (item === "--quiet") {
      result.quiet = true;
      continue;
    }
    if (item === "--file") {
      const next = items[index + 1];
      if (!next) {
        throw new Error("--file 需要传入 Markdown 文件路径");
      }
      result.paths.push(next);
      index += 1;
      continue;
    }
    if (item.startsWith("--")) {
      throw new Error(`未知参数：${item}`);
    }
    result.paths.push(item);
  }

  return result;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const files = collectMarkdownFiles(args.paths.length > 0 ? args.paths : DEFAULT_PATHS);
  const findings = files.flatMap((file) => lintMarkdownFile(file));

  if (!args.quiet || findings.length > 0) {
    console.error(formatFindings(findings));
  }

  process.exit(findings.length > 0 ? 1 : 0);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main();
}
