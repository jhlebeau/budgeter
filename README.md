# Budgeter

A personal budgeting web app for tracking income, spending categories, savings goals, and transactions.

## Features

- **Income tracking** — add multiple income sources with monthly/annual amounts and pre/post-tax configuration (manual rate or auto by US state)
- **Spending categories** — define categories with amount or percent-of-income limits
- **Savings categories** — separate savings goals with their own limits
- **Transactions** — record one-time or recurring (daily/weekly/monthly) transactions; recurring series can be paused or cancelled with per-instance, future, or all-instance scope
- **Monthly spending reports** — per-category breakdown with budget vs. actual for any past or current month
- **Multi-user** — each user has isolated data; password auth with secure session cookies

## Stack

- **Next.js** (App Router) + **React 19** + **TypeScript**
- **Prisma ORM** + **PostgreSQL** (hosted on [Neon](https://neon.tech))
- **Tailwind CSS 4**

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file:
   ```
   DATABASE_URL="postgresql://..."   # pooled connection
   DIRECT_URL="postgresql://..."     # direct connection (for migrations)
   JWT_SECRET="<random secret>"
   ```

3. Apply migrations and generate the Prisma client:
   ```bash
   npx prisma migrate deploy
   ```

4. Start the dev server:
   ```bash
   npm run dev
   ```

## Scripts

```bash
npm run dev       # Development server
npm run build     # Production build
npm run lint      # ESLint
npx prisma migrate dev --name <name>   # Create a new migration
npx prisma studio                      # Database GUI
node --env-file=.env scripts/seed-passwords.mjs  # Set all users without a password to "password"
```
