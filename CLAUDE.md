# CLAUDE.md

This file is read by AI assistants (Claude Code and others) before performing
any work in this repository. It contains codebase conventions, workflow rules,
and a self-learning error log.

---

## Repository Overview

| Field | Value |
|-------|-------|
| Repository | stantheman070911/guochenwei |
| Status | Freshly initialized — no source code committed yet |
| Primary branch | `main` (or `master`) |
| Remote | `http://local_proxy@127.0.0.1:28295/git/stantheman070911/guochenwei` |

When source code is added, update this section with:
- Primary language(s) and runtime versions
- Framework / library stack
- Entry-point files
- Build output directories

---

## Directory Structure

```
guochenwei/
└── CLAUDE.md          ← this file (always keep up to date)
```

Update this tree whenever new directories or significant files are added.

---

## Development Workflow

### Branching
- Feature branches must start with `claude/` and end with the session ID when
  created by an AI assistant (e.g. `claude/add-feature-abc123`).
- Never push directly to `main`/`master` without explicit permission.

### Git Commits
- Use clear, imperative commit messages: `Add login endpoint`, `Fix null pointer in parser`.
- Do not use `--no-verify` or skip hooks unless the user explicitly asks.
- Create **new** commits rather than amending published commits.
- Prefer staging specific files over `git add -A`.

### Git Push
- Always use `git push -u origin <branch-name>`.
- On network failure, retry up to 4 times with exponential backoff: 2 s → 4 s → 8 s → 16 s.

---

## Coding Conventions

> Fill in the sections below once the tech stack is established.

### Language & Formatting
- [ ] Language version (e.g. Python 3.12, Node 20, Go 1.22)
- [ ] Formatter (e.g. `black`, `prettier`, `gofmt`) and how to run it
- [ ] Linter and how to run it

### Testing
- [ ] Test runner and command (e.g. `pytest`, `npm test`, `go test ./...`)
- [ ] Minimum coverage requirement
- [ ] Location of test files (e.g. `tests/`, `__tests__/`, `*_test.go`)

### Security
- Never commit secrets, tokens, or credentials.
- Validate all user input at system boundaries; trust internal framework guarantees.
- Avoid OWASP Top 10 vulnerabilities (SQL injection, XSS, command injection, etc.).

### Avoiding Over-Engineering
- Only change what was explicitly requested.
- Do not add docstrings, comments, or type annotations to untouched code.
- Do not create helpers for one-off operations.
- Do not design for hypothetical future requirements.

---

## AI Assistant Rules

1. **Read this file first** before writing any code.
2. **Read the Error Log** (below) before writing any code — never repeat a logged mistake.
3. Update the Error Log immediately when a new mistake is discovered.
4. Keep solutions minimal and focused on the stated task.
5. Confirm with the user before: deleting files, force-pushing, dropping data, or any action that is hard to reverse.

---

## Self-Learning Error Log

This section is the **self-learning mechanism**: every mistake or error made in
this repository is recorded here. Before starting any coding task, the AI
assistant must read every entry and consciously avoid repeating it.

### How to Add an Entry

```
### [YYYY-MM-DD] Short title of the mistake
**Context**: What was being attempted.
**Mistake**: What went wrong.
**Root cause**: Why it happened.
**Correction**: What was done to fix it.
**Prevention rule**: The concrete rule to follow in the future.
```

---

### Error Entries

_No errors recorded yet. Entries will be appended here as mistakes are identified._

---

*Last updated: 2026-03-09*
