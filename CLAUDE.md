# CLAUDE.md

Read this entire file before writing or modifying any code.

---

## Project

LINE Official Account chatbot powered by Claude AI (郭陳維AI project).

| Key | Value |
|-----|-------|
| Framework | Next.js 14 (App Router), TypeScript strict |
| DB | PostgreSQL via Supabase, Prisma ORM |
| Styling | Tailwind CSS + shadcn/ui |
| AI | Anthropic Claude API (`claude-sonnet-4-20250514`) |
| Messaging | LINE Messaging API |
| Email | Resend |
| Deploy | Vercel |

### Flow

1. User registers on website (name + email).
2. Server generates activation code, emails it via Resend.
3. User sends code to LINE bot.
4. Bot verifies code, links LINE user ID to DB record.
5. Subsequent LINE messages → Claude → reply via LINE API.

---

## Directory Layout

```
app/           → Next.js pages and API routes only
lib/           → Pure TypeScript business logic (NO React/Next imports)
  line/        → Client, webhook validator, reply, handlers (message, follow)
  claude/      → Client, chat, system prompt
  auth/        → Code generation and validation
  db/          → Prisma singleton, user/code/conversation queries
  email/       → Resend client + activation template
components/    → React components (ui/ = shadcn generated)
types/         → Shared TS interfaces
constants/     → Named constants (no magic strings/numbers elsewhere)
prisma/        → schema.prisma, seed.ts
```

---

## Critical Rules

### Boundaries (violating these causes real bugs)

1. **`lib/` is pure TS.** Zero React or Next.js imports. Ever.
2. **One PrismaClient.** Only `lib/db/prisma.ts` instantiates it (stored on `globalThis` to survive hot reload). Never `new PrismaClient()` elsewhere.
3. **No `any`** without a `// any: <justification>` comment.
4. **No secrets in code.** Use `.env.local`. See env table below.

### API Routes

- Type with `NextRequest` / `NextResponse`.
- Return `{ error: string }` + correct HTTP status on failure.
- Validate request bodies before touching the DB.

### Git

- Branch naming: `claude/<description>-<sessionId>`.
- Never push to `main`/`master` without explicit permission.
- Imperative commit messages: `Add login endpoint`, `Fix null in parser`.
- Stage specific files, not `git add -A`.
- Push: `git push -u origin <branch>`. On failure, retry up to 4× (2s → 4s → 8s → 16s).

### Code Style

- Prettier for formatting. ESLint with `next/core-web-vitals`.
- Tests: Vitest, colocated as `*.test.ts` or in `__tests__/`.
- Only change what was requested. No speculative helpers, no drive-by docstrings, no designing for hypothetical futures.

---

## Stack Pitfalls

These cause real, hard-to-debug failures. Memorize them.

| # | Pitfall | Why it matters |
|---|---------|---------------|
| 1 | **Prisma hot-reload leak** | `new PrismaClient()` on every hot reload exhausts DB connections. Use the `globalThis` singleton in `lib/db/prisma.ts`. |
| 2 | **LINE webhook needs raw body** | Signature verification hashes the raw body. Read with `await request.text()` first, then parse. Re-stringifying JSON breaks the hash. |
| 3 | **`prisma generate` after schema changes** | Editing `schema.prisma` without running `npx prisma generate` causes confusing type errors. Always generate before importing updated types. |
| 4 | **Supabase pooled vs direct URL** | `DATABASE_URL` = pooled (port 6543, runtime). `DIRECT_URL` = direct (port 5432, migrations only). Swapping them breaks things silently. |
| 5 | **Vercel limits** | Hobby tier: 10s timeout, 4.5MB body. LINE media forwarded to Claude must respect these. |
| 6 | **shadcn/ui components are editable copies** | Generated via `npx shadcn-ui add <name>`. Edit directly, but don't regenerate without warning — local changes get overwritten. |

---

## Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `ANTHROPIC_API_KEY` | Yes | Claude API |
| `LINE_CHANNEL_ACCESS_TOKEN` | Yes | LINE messaging |
| `LINE_CHANNEL_SECRET` | Yes | Webhook signature verification |
| `DATABASE_URL` | Yes | Supabase pooled connection (runtime) |
| `DIRECT_URL` | Yes | Supabase direct connection (migrations) |
| `RESEND_API_KEY` | Yes | Email sending |
| `RESEND_FROM_EMAIL` | Yes | Sender address |
| `NEXT_PUBLIC_APP_URL` | Yes | Base URL for email links |
| `ACTIVATION_CODE_TTL_HOURS` | No | Code expiry, default `24` |

---

## Verification (run before presenting work)

```bash
npx tsc --noEmit        # types
npm run lint             # eslint
npm run build            # full build
npx vitest run           # tests (if relevant tests exist)
```

All must pass. If any fails due to your code, fix it before continuing.

## Self-Review (after every change, before commit)

Quick mental pass — don't narrate unless you find something:

1. **Does it do what was asked?** Re-read the request. Nothing extra.
2. **Security:** No secrets committed? Input validated? No `eval`/raw SQL/`dangerouslySetInnerHTML`? LINE webhook validation intact?
3. **Conventions:** `lib/` pure TS? Single PrismaClient? No `any` without comment? No magic values?
4. **Diff audit:** `git diff` — any leftover `console.log`, `debugger`, commented-out code, or unintended changes?
5. **Regression:** Did changes to shared `lib/` code break any importers?

If you caught and fixed something, briefly note it: _"Self-review caught X, fixed."_

---

## Code Cleanup (on-demand only)

Run when the user asks for cleanup/refactor, or before creating a PR.

1. **Dead code** — Remove unused imports, unreachable code, leftover `console.log`/`debugger`. Commit: `cleanup: remove dead code in [scope]`
2. **Formatting** — Prettier, normalize imports (external → `lib/` → relative), replace magic values with constants. Commit: `cleanup: normalize formatting in [scope]`
3. **Light refactor** — Only if clearly beneficial: extract repeated logic (≥3 occurrences), flatten deep nesting (>3 levels) with early returns, split functions >80 lines at natural boundaries. Commit: `cleanup: refactor [what] in [scope]`
4. **Verify** — Run all verification commands. All must pass.

Never clean up more than 10 files without user approval. Never redesign architecture.

---

## Error Log

Mistakes made in this repo, logged so they're never repeated. Read all entries before starting work.

**When to log:** After fixing any mistake caught by the user, build failure, or runtime error caused by assistant code. Log it in the same commit as the fix.

**Format:**
```
### [YYYY-MM-DD] Title
**Mistake:** What went wrong.
**Fix:** What corrected it.
**Rule:** How to prevent it.
```

Keep max 15 entries. When full, drop the oldest.

#### Entries

_No errors logged yet._