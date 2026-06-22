# Agent Collaboration

This repo may be edited by the owner, Codex, Claude, and other agents.

## Shared Rules

- Read `CONTEXT.md` before making decisions that affect product direction.
- Prefer shared docs over agent-specific memory.
- Keep `AGENTS.md` and `CLAUDE.md` as thin entry files.
- Put shared workflow rules in `docs/agents/`.
- Put lasting architecture decisions in `docs/adr/`.
- Do not revert another person's or agent's changes unless explicitly asked.

## 执行节奏（前后端分轮）

一个 feature 的**前端与后端分属不同 agent 轮次**，不要在同一轮里既写后端又写前端。两轮通过 `lib/<feature>.ts` 这类**带类型的服务层契约**对接（函数签名 + 类型先定）。

- **默认前端先行**：先以服务层契约的 TypeScript 类型 + 函数签名为准，用返回 fixture 的 stub 把 UI 做出来；UI 反过来定稿契约（缺字段就改契约，别将就）。后端轮再实现真逻辑替换 stub，契约不变则前端不返工。
- **前端轮不得在生产暴露未鉴权占位**：涉及付费/受限内容的入口（如 `/forum`）在后端门禁落地前不要挂进 nav / 路由。
- 后端风险极高、UI 极薄的 feature 可由 owner 指定改为后端先行。

## Content Boundaries

Do not commit paid course bodies, protected forum content, card keys, private exports, credentials, or database dumps.

When adding examples, use fake data that cannot be mistaken for a real card key or private student record.

## Design Boundaries

For brand and illustration work, follow `docs/草台编子识字班插画美术规范.md`.

Do not drift into generic SaaS, corporate AI, glossy 3D, or stock marketing visuals unless the owner explicitly redirects the art direction.

