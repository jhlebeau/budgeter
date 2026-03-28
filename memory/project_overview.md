---
name: Project Overview
description: Tech stack, key directories, and conventions for budgeter-web
type: project
---

Full-stack personal budgeting app. Stack: Next.js 16 (App Router), React 19, TypeScript strict, Prisma ORM, PostgreSQL (Neon), Tailwind CSS 4.

**Key directories:**
- `app/` — Next.js pages and API routes (App Router)
- `app/hooks/` — domain hooks (`useCategories`, `useSavingCategories`, `useIncomes`, `useTransactions`)
- `app/ui/` — shared UI components (site nav, dashboard theme, toast, confirm modal)
- `lib/` — pure utilities: `auth.ts`, `api-user.ts`, `budget-types.ts`, `input-validation.ts`, `prisma.ts`
- `prisma/` — schema and migrations

**Mutation conventions:**
- `addX()` returns `Promise<string | null>` — null = success, string = validation/API error for inline display
- `deleteX()` and `updateX()` return `Promise<boolean>` — true = success, false = failure (caller shows toast)

**UX feedback conventions:**
- Form validation errors shown inline (via `submitError` / `editError` state)
- API/network failures shown as toasts via `useToast()` from `app/ui/toast.tsx`
- Delete actions use `ConfirmModal` from `app/ui/confirm-modal.tsx` — no `window.confirm()`
