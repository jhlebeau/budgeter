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
```

There are no tests configured in this project.

## Architecture

This is a full-stack budgeting app built with Next.js (App Router), React 19, Prisma ORM, and PostgreSQL (hosted on Neon). TypeScript strict mode is enabled throughout.

### State Management

All client-side state lives in `app/budget-context.tsx` — a single React Context (`BudgetContext`) that holds the logged-in user plus all entities (categories, transactions, income sources, saving categories). Components consume it via `useBudget()`. The context performs all API calls and is the single source of truth for UI state.

### Authentication

There is no JWT or session system. The user ID is stored in context after login and sent as an `x-user-id` HTTP header on every API request. The `authFetch()` helper in `budget-context.tsx` attaches this header automatically. On the server, `lib/api-user.ts` extracts and validates it. The `app/auth-gate.tsx` component redirects unauthenticated users to the login page.

### API Routes

All API routes live under `app/api/`. They follow a simple REST pattern:
- Read user ID from `x-user-id` header via `lib/api-user.ts`
- Validate inputs using helpers in `lib/input-validation.ts`
- Query the database via the Prisma singleton in `lib/prisma.ts`

### Database

Schema is defined in `prisma/schema.prisma`. Key models: `User`, `IncomeSource`, `SpendingCategory`, `SavingCategory`, `Transaction`, `RecurringTransaction`, `RecurringTransactionSkipDate`. Cascading deletes are configured at the DB level.

The Prisma client uses the `@prisma/adapter-pg` adapter for PostgreSQL. Connection strings come from `DATABASE_URL` (pooled) and `DIRECT_URL` (direct, for migrations) in `.env`.

### Routing

Pages follow Next.js App Router conventions under `app/`. The root `/` is the login page. After login, users land on `/home`. `/spending/[month]` is a dynamic route for monthly spending views.

### Styling

Tailwind CSS 4 via `@tailwindcss/postcss`. Dark-themed UI using slate backgrounds with cyan, violet, and rose accent colors. Shared layout components are in `app/ui/`.
