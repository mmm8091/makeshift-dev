# Issue tracker: GitHub

Issues and PRDs for this repo live as GitHub issues.

Repository: `mmm8091/makeshift-dev`

Use the `gh` CLI for issue and pull request operations when available.

## Conventions

- **Create an issue**: `gh issue create --title "..." --body "..."`
- **Read an issue**: `gh issue view <number> --comments`
- **List issues**: `gh issue list --state open --json number,title,body,labels,comments`
- **Comment on an issue**: `gh issue comment <number> --body "..."`
- **Apply or remove labels**: `gh issue edit <number> --add-label "..."` / `--remove-label "..."`
- **Close**: `gh issue close <number> --comment "..."`

Infer the repo from `git remote -v`; `gh` does this automatically when run inside the clone.

## Pull Requests As A Triage Surface

**PRs as a request surface: yes.**

Student PRs are part of the course workflow. The first GitHub assignment is expected to be a PR that adds the student to the public student table, including the public profile fields the course asks them to expose.

External student PRs should run through the same labels and states as issues, using the `gh pr` equivalents:

- **Read a PR**: `gh pr view <number> --comments` and `gh pr diff <number>` for the diff.
- **List external PRs for triage**: `gh pr list --state open --json number,title,body,labels,author,authorAssociation,comments`, then keep only `authorAssociation` values of `CONTRIBUTOR`, `FIRST_TIME_CONTRIBUTOR`, or `NONE`.
- **Comment, label, or close**: `gh pr comment`, `gh pr edit --add-label` / `--remove-label`, `gh pr close`.

GitHub shares one number space across issues and PRs, so a bare `#42` may be either. Resolve with `gh pr view 42` and fall back to `gh issue view 42`.

## When A Skill Says "Publish To The Issue Tracker"

Create a GitHub issue.

## When A Skill Says "Fetch The Relevant Ticket"

Run `gh issue view <number> --comments` for issues, or `gh pr view <number> --comments` for PRs.

## Safety

Do not expose paid course content, private forum content, card keys, private student records, credentials, or database dumps in issue bodies, PR comments, or generated examples.

