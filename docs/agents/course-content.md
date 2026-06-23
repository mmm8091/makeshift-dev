# Course Content Workflow

This repo uses Markdown as the editing surface for course documents, but keeps the public/private boundary strict.

## Public Course Text

Public course bodies may live in the repository under:

```txt
content/courses/
```

When adding a public course:

1. Put the Markdown file in `content/courses/{slug}.md`.
2. Import it in `lib/content.ts` and add it to `PUBLIC_COURSE_MARKDOWN`.
3. Add public metadata in `lib/courses.ts`.
4. Put public illustrations in `public/illustrations/`; keep source images in `设计资产/`.

## Locked Course Text

Locked course bodies must not be committed.

Use the local ignored directory:

```txt
课程文档/
```

Then publish to D1 with:

```powershell
pnpm course:import -- --remote --file "课程文档/1.1：意图驱动开发.md" `
  --slug 1-1-intent-driven-development `
  --title "1.1：意图驱动开发" `
  --summary "把原始意志锤成可以交给 AI 执行、验证和修正的工程意图" `
  --order 2 `
  --visibility locked `
  --required-entitlement course:full
```

The script upserts `course_sections` by slug and writes the Markdown into `body_md`.

## Agent Editing Locked Course Text

When the user asks an Agent to change a locked course article, use this flow:

1. Locate the source Markdown under ignored `课程文档/`.
2. Make the smallest text edit in that local source file.
3. Do not quote or summarize more paid content than the user already provided.
4. Run the import script for that one slug with `--remote`.
5. Verify the change with a targeted D1 query, such as `instr(body_md, '短语')`, not by printing the full article body.
6. Leave `课程文档/` uncommitted; it is intentionally ignored.

Example:

```powershell
pnpm course:import -- --remote --file "课程文档/1.3：提问，以及向AI提问.md" `
  --slug 1-3-asking-questions `
  --title "1.3：提问，以及向AI提问" `
  --summary "把问题、上下文和验证方式说清楚，让提问成为可训练的开发能力" `
  --order 4 `
  --visibility locked `
  --required-entitlement course:full

pnpm wrangler d1 execute makeshift-dev --remote --command `
  "select slug, instr(body_md, '目标短语') as phrase_pos from course_sections where slug = '1-3-asking-questions';"
```

If the local ignored source is missing, do not reconstruct a locked article from production output or ask the MCP reader to dump it into the repo. Ask the owner for the source file or make a deliberately tiny D1-only patch only when the requested change is exact and unambiguous.

Before importing, the script runs the same Markdown checks as:

```powershell
pnpm course:lint -- --file "课程文档/1.4：GitHub——全世界程序员的作品集.md"
```

The linter does not rewrite course text. It reports risky Markdown patterns
with file, line, and column numbers, especially Feishu-exported escaped URLs
such as `https://github\.com` and bare URLs inside Chinese prose parentheses.
Fix those as explicit Markdown links before importing.

## Image Assets In Locked Markdown

If locked Markdown references images, put only non-sensitive reusable assets under `public/`.

For example:

```txt
public/memes/vibe1.png
public/memes/vibe2.png
```

Then reference them from Markdown:

```md
![Vibe Coding 梗图](/memes/vibe1.png)
```

Do not put paid lesson explanations, private forum content, card keys, private student records, credentials, or database exports in committed files.
