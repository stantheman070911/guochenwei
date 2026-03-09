# CLAUDE.md

This file is read by AI assistants (Claude Code and others) before performing
any work in this repository. It contains codebase conventions, workflow rules,
and a self-learning error log.

---

## Repository Overview

| Field | Value |
|-------|-------|
| Repository | stantheman070911/guochenwei |
| Project | 雞掰管家 — LINE Official Account chatbot powered by Claude AI |
| Primary branch | `main` (or `master`) |
| Remote | `http://local_proxy@127.0.0.1:28295/git/stantheman070911/guochenwei` |
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Database | PostgreSQL via Supabase |
| ORM | Prisma |
| Styling | Tailwind CSS + shadcn/ui |
| Email | Resend |
| Deployment | Vercel |
| AI | Anthropic Claude API (`claude-sonnet-4-20250514`) |
| Messaging | LINE Messaging API |

### How it works
1. User registers on the Next.js website (name + email).
2. Server generates a unique activation code and emails it via Resend.
3. User sends the activation code to the LINE bot.
4. Bot verifies the code, links the LINE user ID to the DB record.
5. All subsequent LINE messages are forwarded to Claude with a fixed system
   prompt; the reply is sent back to the user via the LINE Messaging API.

---

## Directory Structure

```
guochenwei/
├── CLAUDE.md
├── .env.local                        ← secrets (never commit)
├── .env.example                      ← safe template to commit
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── middleware.ts                     ← protects /dashboard routes
│
├── prisma/
│   ├── schema.prisma                 ← User, ActivationCode, Conversation models
│   └── seed.ts                       ← optional seed data
│
├── app/
│   ├── layout.tsx                    ← root layout
│   ├── globals.css
│   ├── page.tsx                      ← landing / registration page
│   ├── activate/
│   │   └── page.tsx                  ← shows activation code post-registration
│   ├── dashboard/
│   │   ├── layout.tsx
│   │   └── page.tsx                  ← user goal tracking overview
│   └── api/
│       ├── register/
│       │   └── route.ts              ← POST: create user + send code email
│       ├── verify-code/
│       │   └── route.ts              ← POST: validate activation code
│       └── line/
│           └── webhook/
│               └── route.ts         ← POST: LINE event dispatcher
│
├── lib/                              ← pure TypeScript, no React/Next imports
│   ├── line/
│   │   ├── client.ts
│   │   ├── webhook-validator.ts
│   │   ├── reply.ts
│   │   └── handlers/
│   │       ├── message.ts
│   │       └── follow.ts
│   ├── claude/
│   │   ├── client.ts
│   │   ├── chat.ts
│   │   └── system-prompt.ts
│   ├── auth/
│   │   ├── generate-code.ts
│   │   └── validate-code.ts
│   ├── db/
│   │   ├── prisma.ts                 ← singleton client
│   │   ├── user.ts
│   │   ├── code.ts
│   │   └── conversation.ts
│   └── email/
│       ├── resend.ts
│       └── templates/
│           └── activation.tsx
│
├── components/
│   ├── ui/                           ← shadcn/ui auto-generated components
│   ├── register-form.tsx
│   └── code-display.tsx
│
├── types/
│   ├── line.ts
│   └── api.ts
│
└── constants/
    ├── claude.ts
    └── line.ts
```

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

### Local Dev Commands

| Task | Command |
|------|---------|
| Install deps | `npm install` |
| Dev server | `npm run dev` |
| Build | `npm run build` |
| Lint | `npm run lint` |
| Prisma migrate | `npx prisma migrate dev` |
| Prisma studio | `npx prisma studio` |
| Seed DB | `npx ts-node prisma/seed.ts` |

---

## Coding Conventions

### Language & Formatting
- TypeScript strict mode — no `any` unless unavoidable.
- Formatter: `prettier` (run `npx prettier --write .`).
- Linter: `eslint` with `next/core-web-vitals`.

### File Conventions
- `app/` — Next.js App Router pages and API routes only.
- `lib/` — pure TypeScript business logic. **No React, no Next.js imports.**
- `components/` — React components only.
- `types/` — shared TypeScript interfaces/types.
- `constants/` — named constants; no magic strings/numbers elsewhere.

### API Routes
- All routes typed with `NextRequest` / `NextResponse`.
- Return `{ error: string }` with appropriate HTTP status on failure.
- Validate request bodies before touching the database.

### Database
- Always use the `lib/db/prisma.ts` singleton — never `new PrismaClient()` elsewhere.
- Wrap multi-step mutations in Prisma transactions.

### Testing
- [ ] Test runner and command (e.g. `jest`, `vitest`)
- [ ] Minimum coverage requirement
- [ ] Location of test files (e.g. `__tests__/`, `*.test.ts`)

### Security
- Never commit secrets, tokens, or credentials (use `.env.local`).
- Validate all LINE webhook requests with `lib/line/webhook-validator.ts`.
- Validate all user input at API boundaries.
- Avoid OWASP Top 10 vulnerabilities (SQL injection, XSS, command injection, etc.).

### Avoiding Over-Engineering
- Only change what was explicitly requested.
- Do not add docstrings, comments, or type annotations to untouched code.
- Do not create helpers for one-off operations.
- Do not design for hypothetical future requirements.

---

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `ANTHROPIC_API_KEY` | Anthropic Claude API key |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE bot channel access token |
| `LINE_CHANNEL_SECRET` | Used to verify webhook signatures |
| `DATABASE_URL` | Supabase pooled connection string (for Prisma) |
| `DIRECT_URL` | Supabase direct connection (for migrations) |
| `RESEND_API_KEY` | Resend email API key |
| `RESEND_FROM_EMAIL` | Sender address for activation emails |
| `NEXT_PUBLIC_APP_URL` | Public base URL of the Next.js app |
| `ACTIVATION_CODE_TTL_HOURS` | Hours before an unused code expires (default 24) |

---

## AI Assistant Rules

1. **Read this file first** before writing any code.
2. **Read the Error Log** (below) before writing any code — never repeat a logged mistake.
3. Update the Error Log immediately when a new mistake is discovered.
4. Keep solutions minimal and focused on the stated task.
5. `lib/` must stay free of React/Next.js imports — keep it pure TypeScript.
6. Confirm with the user before: deleting files, force-pushing, dropping data,
   or any action that is hard to reverse.

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
