# AGENTS.md

This repository is the working home for "草台编子识字班".

## Agent skills

### Issue tracker

Issues live in GitHub Issues for `mmm8091/makeshift-dev`; external student PRs are also a triage surface. See `docs/agents/issue-tracker.md`.

### Triage labels

Use the default five-label vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, and `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

This is a single-context repo: read `CONTEXT.md` and relevant ADRs under `docs/adr/`. See `docs/agents/domain.md`.

## Project Rules

Before making product, architecture, content, or design decisions, read:

1. `CONTEXT.md`
2. `docs/agents/domain.md`
3. `docs/agents/issue-tracker.md`
4. `docs/agents/triage-labels.md`
5. `docs/agents/collaboration.md`

Important project documents:

- `docs/草台编子识字班产品技术方案.md`
- `docs/草台编子识字班插画美术规范.md`

Working rules:

- Keep paid course content out of the public repository, frontend bundles, and static build output.
- Treat public PRs from students as part of the learning workflow.
- Preserve the project's plain, grassroots, worker-education tone.
- Prefer small, reviewable changes that leave a clear trail in docs or ADRs when decisions matter.
- Do not overwrite work from another agent or human without first understanding it.
- Codex-authored commits should use `Codex <codex@openai.com>` as the git author; do not change the repository's default author for human or other-agent commits.
