# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

## Before Exploring, Read These

- `CONTEXT.md` at the repo root.
- Relevant docs under `docs/`.
- Relevant ADRs under `docs/adr/`.

If any of these files do not exist yet, proceed silently. The domain model should grow as real terms and decisions become clear.

## File Structure

This is a single-context repo:

```txt
/
├── CONTEXT.md
├── docs/
│   ├── agents/
│   └── adr/
└── src/
```

## Where Knowledge Lives

- Long-lived project context: `CONTEXT.md`
- Product and technical plan: `docs/草台编子识字班产品技术方案.md`
- Art direction: `docs/草台编子识字班插画美术规范.md`
- Architecture decisions: `docs/adr/`
- Agent workflow rules: `docs/agents/`

## Use The Project Vocabulary

When output names a domain concept, use the vocabulary from `CONTEXT.md` and the product docs. Do not drift to generic SaaS or corporate training language when the project has a sharper, grassroots term.

If the concept you need is not in the glossary yet, either reconsider whether the project actually uses it or note the gap for domain modeling.

## When To Add An ADR

Add or update an ADR when a decision changes one of these:

- Authentication or entitlement rules.
- Paid content storage.
- Deployment architecture.
- Database ownership boundaries.
- Student PR workflow.
- Forum access model.
- Public/private content split.

## Flag ADR Conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding it.

