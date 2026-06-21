# CLAUDE.md

This repository is shared by the human team, Codex, Claude, and future agents.

## Agent skills

### Issue tracker

Issues live in GitHub Issues for `mmm8091/makeshift-dev`; external student PRs are also a triage surface. See `docs/agents/issue-tracker.md`.

### Triage labels

Use the default five-label vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, and `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

This is a single-context repo: read `CONTEXT.md` and relevant ADRs under `docs/adr/`. See `docs/agents/domain.md`.

## Shared Expectations

Before changing the product, architecture, course content model, or design system, read:

1. `CONTEXT.md`
2. `docs/agents/domain.md`
3. `docs/agents/issue-tracker.md`
4. `docs/agents/triage-labels.md`
5. `docs/agents/collaboration.md`
6. `docs/agents/frontend.md`（前端与内容的已落地约定）

Important project documents:

- `docs/草台编子识字班产品技术方案.md`
- `docs/草台编子识字班插画美术规范.md`

Shared expectations:

- Keep paid course text and protected forum content server-side.
- Do not put paid course bodies into this public repository.
- When architecture decisions become sticky, record them in `docs/adr/`.
- Keep agent-specific notes short; put shared rules in `docs/agents/` or `CONTEXT.md`.
- Coordinate through small commits and clear file-level changes.

