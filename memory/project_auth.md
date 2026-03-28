---
name: Auth Architecture
description: Password auth + JWT session cookie implementation details
type: project
---

Auth was implemented in March 2026. Key facts:

- Passwords hashed with bcryptjs (cost 12), stored in `User.passwordHash` (nullable String — existing users without a hash cannot log in)
- Sessions use HS256 JWT signed with `JWT_SECRET` env var, stored in an HttpOnly `session` cookie (30-day expiry) via `jose`
- Auth helpers: `lib/auth.ts` (sign/verify JWT), `lib/api-user.ts` (requireUserId reads cookie, no longer uses x-user-id header)
- New endpoints: `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/session`
- Session restored on page load via `GET /api/auth/session` called from `BudgetProvider` on mount; `sessionLoading` state prevents premature redirect in `AuthGate`
- `logout()` function exposed on BudgetContext

**Why:** The original x-user-id header was self-reported by the client — any user could forge another user's ID.

**How to apply:** If adding new authenticated API routes, use `await requireUserId()` (no request parameter needed). For client-side logout, call `useBudget().logout()`.
