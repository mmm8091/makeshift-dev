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
