# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev       # Start development server
npm run build     # Generate Prisma client + build for production
npm run lint      # Run ESLint
npx prisma migrate dev --name <name>   # Create and apply a new migration
npx prisma studio # Open Prisma database GUI
node --env-file=.env scripts/seed-passwords.mjs  # Seed existing users with "password"
```

There are no tests configured in this project.

## Architecture

This is a full-stack budgeting app built with Next.js (App Router), React 19, Prisma ORM, and PostgreSQL (hosted on Neon). TypeScript strict mode is enabled throughout.

### State Management

Client-side state is split across:
- `app/budget-context.tsx` — React Context that holds session state, `authFetch`, and composes domain hooks. Exposes everything via `useBudget()`. Also re-exports all types from `lib/budget-types.ts` for backward compatibility.
- `app/hooks/useCategories.ts` — spending category state + CRUD
- `app/hooks/useSavingCategories.ts` — saving category state + CRUD
- `app/hooks/useIncomes.ts` — income state + CRUD
- `app/hooks/useTransactions.ts` — transaction mutations only (no state; pages own transaction state locally)
- `lib/budget-types.ts` — all shared types (`Category`, `AppUser`, `Transaction`, `Income`, etc.), API response shapes (`ApiCategory`, `ApiTransaction`, etc.), and mappers (`toCategory`, `toIncome`, `toTransaction`)

Transaction state is page-local (not in context). Pages fetch their own paginated transactions and use a `refreshKey` pattern to trigger re-fetches after mutations.

### Authentication

Password authentication using bcrypt (cost 12) + HS256 JWT session cookies. The cookie is HttpOnly, SameSite=Lax, 30-day expiry, named `session`. `JWT_SECRET` must be set in `.env` (and Vercel environment variables for production).

- `lib/auth.ts` — `signSession()` / `verifySession()` helpers
- `lib/api-user.ts` — `requireUserId()` reads the session cookie server-side (async, uses `cookies()` from `next/headers`)
- `app/auth-gate.tsx` — redirects unauthenticated users; waits for `sessionLoading` before redirecting to avoid flicker
- Session is restored on mount via `GET /api/auth/session`

Auth API routes: `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/session`, `PATCH /api/users/password`

### API Routes

All routes live under `app/api/`. Pattern:
- Call `await requireUserId()` — returns `{ userId, errorResponse }` (return `errorResponse` early if set)
- Validate inputs via `lib/input-validation.ts`
- Query DB via Prisma singleton in `lib/prisma.ts`

Transaction routes support:
- `GET /api/transactions?month=YYYY-MM` — returns `{ transactions }` filtered by month (used by spending pages)
- `GET /api/transactions?page=N&pageSize=N` — returns `{ transactions, total, page, pageSize, monthSpend, monthCount, activeRecurringSeriesCount }`
- `GET /api/transactions/months` — returns `string[]` of distinct `YYYY-MM` keys

### Database

Schema: `prisma/schema.prisma`. Key models: `User` (has `passwordHash String?`), `IncomeSource`, `SpendingCategory`, `SavingCategory`, `Transaction`, `RecurringTransaction`, `RecurringTransactionSkipDate`. Cascading deletes at DB level.

Prisma client uses `@prisma/adapter-pg`. Connection strings: `DATABASE_URL` (pooled) and `DIRECT_URL` (direct, for migrations) in `.env`.

### Routing

Root `/` is the login page. After login → `/home`. Key dynamic route: `/spending/[month]` (YYYY-MM format). Nav: `app/ui/site-nav.tsx` — uses a portal-rendered dropdown for the Setup menu (needed to escape stacking context).

### Styling

Tailwind CSS 4 via `@tailwindcss/postcss`. Dark UI: slate backgrounds, cyan/violet/rose accents. Shared layout in `app/ui/`. Skeleton loading uses `animate-pulse` with `bg-slate-800/50` placeholder blocks.
