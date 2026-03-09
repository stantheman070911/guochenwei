# CLAUDE.md

This file is read by AI assistants (Claude Code and others) **before performing
any work** in this repository. It contains codebase conventions, workflow rules,
stack-specific pitfalls, and a self-learning error log.

> **AI assistants: you must read this file in full — including the Error Log at
> the bottom — before writing or modifying any code.**

---

## Repository Overview

| Field | Value |
|-------|-------|
| Repository | stantheman070911/guochenwei |
| Project | 郭陳維AI project — LINE Official Account chatbot powered by Claude AI |
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

> **Note on Remote URL:** The remote points to a local Git proxy
> (`127.0.0.1:28295`). Do not attempt to `curl`, `fetch`, or interact with this
> URL outside of normal `git` commands.

### How It Works

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
├── lib/                              ← pure TypeScript, NO React/Next imports
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
│   │   ├── prisma.ts                 ← singleton client (see Pitfalls §1)
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
- On push failure, retry the command up to **4 times** before reporting failure
  to the user. Wait between retries: 2 s → 4 s → 8 s → 16 s.

### Local Dev Commands

| Task | Command |
|------|---------|
| Install deps | `npm install` |
| Dev server | `npm run dev` |
| Build | `npm run build` |
| Lint | `npm run lint` |
| Type check | `npx tsc --noEmit` |
| Format | `npx prettier --write .` |
| Prisma migrate | `npx prisma migrate dev` |
| Prisma generate | `npx prisma generate` |
| Prisma studio | `npx prisma studio` |
| Seed DB | `npx ts-node prisma/seed.ts` |
| Test | `npx vitest run` |
| Test (watch) | `npx vitest` |

---

## Coding Conventions

### Language & Formatting

- TypeScript strict mode — no `any` unless unavoidable and commented with a
  justification (e.g. `// any: third-party lib returns unknown shape`).
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

- Always use the `lib/db/prisma.ts` singleton — **never** `new PrismaClient()`
  elsewhere (see Pitfalls §1 for why).
- Wrap multi-step mutations in Prisma transactions.
- After changing `schema.prisma`, always run `npx prisma generate` before
  importing updated types.

### Testing

- Runner: **Vitest** (`npx vitest`).
- Test files: colocated as `*.test.ts` next to the source file, or under
  `__tests__/` in the same directory.
- Focus: unit tests for `lib/` logic; integration tests for API routes.
- Run `npx vitest run` before committing — do not commit code that fails tests.

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

| Variable | Required | Purpose | On missing |
|----------|----------|---------|------------|
| `ANTHROPIC_API_KEY` | **Yes** | Anthropic Claude API key | Bot replies fail |
| `LINE_CHANNEL_ACCESS_TOKEN` | **Yes** | LINE bot channel access token | All LINE messaging fails |
| `LINE_CHANNEL_SECRET` | **Yes** | Verify webhook signatures | Webhooks rejected |
| `DATABASE_URL` | **Yes** | Supabase pooled connection string (Prisma) | App crashes on boot |
| `DIRECT_URL` | **Yes** | Supabase direct connection (migrations only) | Migrations fail |
| `RESEND_API_KEY` | **Yes** | Resend email API key | Activation emails not sent |
| `RESEND_FROM_EMAIL` | **Yes** | Sender address for activation emails | Emails rejected |
| `NEXT_PUBLIC_APP_URL` | **Yes** | Public base URL of the Next.js app | Links in emails broken |
| `ACTIVATION_CODE_TTL_HOURS` | No | Hours before an unused code expires | Defaults to `24` |

> Before first run, copy `.env.example` to `.env.local` and fill in all
> **required** values.

---

## Stack-Specific Pitfalls

These are common mistakes with this exact tech stack. Read before writing code.

### §1 — Prisma Client in Serverless / Next.js Dev

In development, Next.js hot-reloads modules which causes `new PrismaClient()`
to be called repeatedly, exhausting database connections. This is why
`lib/db/prisma.ts` stores the client on `globalThis`. **Never instantiate
PrismaClient anywhere else.** If you see `Too many clients already` errors,
this is always the cause.

### §2 — LINE Webhook Signature Validation Requires the Raw Body

The LINE SDK verifies webhook authenticity by hashing the **raw request body**.
If you parse the body as JSON first and then re-stringify it, whitespace or key
ordering differences will break the signature check. Always read the raw body
(`await request.text()`) **before** parsing, and pass the raw string to the
validator.

### §3 — Prisma Schema Changes Require `prisma generate`

After any edit to `schema.prisma`, you must run `npx prisma generate` before
the TypeScript compiler (or the dev server) will recognize new/changed models
and fields. Forgetting this step leads to confusing type errors that look like
the schema change didn't work.

### §4 — Supabase Pooled vs. Direct Connection Strings

`DATABASE_URL` must be the **pooled** (PgBouncer, port `6543`) connection
string — used at runtime by Prisma Client. `DIRECT_URL` must be the **direct**
(port `5432`) connection — used only for migrations. Swapping them causes
migrations to hang or runtime queries to fail intermittently.

### §5 — Vercel Serverless Function Body Size & Timeout

Vercel Hobby tier has a 10 s function timeout and 4.5 MB request body limit.
LINE image/video messages forwarded to Claude must respect these limits. If
processing takes longer, consider background jobs or upgrading the tier.

### §6 — shadcn/ui Components Are Generated, Not Installed

Components in `components/ui/` are generated by `npx shadcn-ui add <name>`.
They are meant to be **edited directly**. Do not treat them as immutable
third-party code, but also do not regenerate them without warning — local
customizations will be overwritten.

---

## AI Assistant Rules

1. **Read this entire file** — including the Error Log — before writing any code.
2. **Never repeat a logged mistake.** Check every Error Log entry for relevance
   to the current task.
3. **Log mistakes immediately.** When the user corrects a mistake, or when a
   build / lint / type-check / test fails due to code the assistant wrote, add
   an Error Log entry **before continuing with the fix** (see format below).
4. Keep solutions minimal and focused on the stated task.
5. `lib/` must stay free of React/Next.js imports — keep it pure TypeScript.
6. Confirm with the user before: deleting files, force-pushing, dropping data,
   or any action that is hard to reverse.
7. After making changes, run the relevant verification command (`npm run build`,
   `npm run lint`, `npx tsc --noEmit`, or `npx vitest run`) and fix issues
   before presenting the work as done.
8. When creating or modifying API routes, verify the route works with a quick
   `curl` or equivalent test if the dev server is running.

---

## Self-Learning Error Log

This section is the **self-learning mechanism**: every mistake or error made in
this repository is recorded here so it is never repeated. The AI assistant must
read every entry before starting any coding task and consciously avoid repeating
logged mistakes.

### Rules

1. **When to add an entry:**
   - The user corrects a mistake the assistant made.
   - A build, lint, type-check, or test fails due to assistant-written code.
   - A runtime error is traced back to assistant-written code.
   - The assistant realizes it violated a rule in this file.

2. **Add the entry before continuing.** Do not fix the code first; log the
   mistake, then fix it. This ensures the log is never forgotten.

3. **Entry format** (copy-paste and fill in):

```
### [YYYY-MM-DD] Short title of the mistake
**Context:** What was being attempted.
**Mistake:** What went wrong.
**Root cause:** Why it happened.
**Correction:** What was done to fix it.
**Prevention rule:** The concrete rule to follow in the future.
```

4. **Entry cap:** Keep a maximum of **30 entries** in this section. When the
   limit is reached, move the 10 oldest entries to `docs/ERROR_ARCHIVE.md`
   (create the file if it doesn't exist) and leave a note here:
   `_Archived 10 entries on YYYY-MM-DD. See docs/ERROR_ARCHIVE.md._`

5. **Review cadence:** At the start of every task, scan entries for any that
   are relevant to the current work. If an entry is relevant, explicitly
   acknowledge it in your plan before writing code.

---

### Error Entries

_No errors recorded yet. Entries will be appended here as mistakes are identified._

---

*Last updated: 2026-03-09*