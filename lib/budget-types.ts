import { TaxStateCode } from "@/lib/tax-states";

// ── Domain types ──────────────────────────────────────────────────────────────

export type Category = {
  id: string;
  name: string;
  limitType: "amount" | "percent";
  limitValue: number;
};

export type AppUser = {
  id: string;
  username: string;
};

export type Transaction = {
  id: string;
  amount: number;
  categoryId: string;
  categoryName: string;
  date: string;
  note: string;
  recurringSeriesId: string | null;
  recurrenceFrequency: "daily" | "weekly" | "monthly" | null;
  recurringSeriesStatus: "active" | "paused" | null;
};

export type TransactionInput = {
  amount: number;
  categoryId: string;
  date: string;
  note: string;
  isRecurring?: boolean;
  recurrenceFrequency?: "daily" | "weekly" | "monthly";
};

export type RecurrenceScope = "this" | "future" | "all";

export type Income = {
  id: string;
  source: string;
  amount: number;
  inputAmount: number;
  period: "monthly" | "annual";
  startMonth: string;
  endMonth: string | null;
  taxType: "pre" | "post";
  taxMethod: "manual" | "auto";
  taxState: TaxStateCode | null;
  taxRate: number;
  postTaxAmount: number;
};

export type IncomeInput = {
  source: string;
  amount: number;
  period: "monthly" | "annual";
  startMonth: string;
  endMonth: string | null;
  taxType: "pre" | "post";
  taxMethod: "manual" | "auto";
  taxState: TaxStateCode | null;
  taxRate: number;
};

// ── API response shapes ───────────────────────────────────────────────────────

export type ApiIncome = {
  id: string;
  name: string;
  amount: number;
  frequency: "MONTHLY" | "ANNUAL";
  startMonth: string;
  endMonth: string | null;
  isPreTax: boolean;
  taxRate: number | null;
  taxState: TaxStateCode | null;
};

export type ApiCategory = {
  id: string;
  name: string;
  limitType: "AMOUNT" | "PERCENT";
  limitValue: number;
};

export type ApiSavingCategory = {
  id: string;
  name: string;
  limitType: "AMOUNT" | "PERCENT";
  limitValue: number;
};

export type ApiTransaction = {
  id: string;
  amount: number;
  date: string;
  description: string | null;
  categoryId: string;
  category: { id: string; name: string };
  recurringSeries: {
    id: string;
    frequency: "DAILY" | "WEEKLY" | "MONTHLY";
    endDate: string | null;
    isPaused: boolean;
  } | null;
};

export type ApiRecurringSeries = {
  id: string;
  amount: number;
  description: string | null;
  frequency: "DAILY" | "WEEKLY" | "MONTHLY";
  startDate: string;
  endDate: string | null;
  isPaused: boolean;
  categoryId: string;
  category: { id: string; name: string };
  _count: { transactions: number };
};

export type RecurringSeries = {
  id: string;
  amount: number;
  description: string | null;
  frequency: "daily" | "weekly" | "monthly";
  startDate: string;
  endDate: string | null;
  isPaused: boolean;
  categoryId: string;
  categoryName: string;
  transactionCount: number;
};

export const toRecurringSeries = (s: ApiRecurringSeries): RecurringSeries => ({
  id: s.id,
  amount: s.amount,
  description: s.description,
  frequency:
    s.frequency === "DAILY" ? "daily" : s.frequency === "WEEKLY" ? "weekly" : "monthly",
  startDate: s.startDate.slice(0, 10),
  endDate: s.endDate ? s.endDate.slice(0, 10) : null,
  isPaused: s.isPaused,
  categoryId: s.categoryId,
  categoryName: s.category.name,
  transactionCount: s._count.transactions,
});

// ── Mappers ───────────────────────────────────────────────────────────────────

export const toIncome = (income: ApiIncome): Income => {
  const monthlyAmount =
    income.frequency === "ANNUAL" ? income.amount / 12 : income.amount;
  const taxRate = income.isPreTax ? income.taxRate ?? 0 : 0;
  const postTaxAmount = income.isPreTax
    ? monthlyAmount * (1 - taxRate / 100)
    : monthlyAmount;

  return {
    id: income.id,
    source: income.name,
    amount: monthlyAmount,
    inputAmount: income.amount,
    period: income.frequency === "ANNUAL" ? "annual" : "monthly",
    startMonth: income.startMonth,
    endMonth: income.endMonth,
    taxType: income.isPreTax ? "pre" : "post",
    taxMethod: income.isPreTax && income.taxState ? "auto" : "manual",
    taxState: income.taxState,
    taxRate,
    postTaxAmount,
  };
};

export const toCategory = (category: ApiCategory | ApiSavingCategory): Category => ({
  id: category.id,
  name: category.name,
  limitType: category.limitType === "AMOUNT" ? "amount" : "percent",
  limitValue: category.limitValue,
});

export const toTransaction = (transaction: ApiTransaction): Transaction => {
  return {
    id: transaction.id,
    amount: transaction.amount,
    categoryId: transaction.categoryId,
    categoryName: transaction.category.name,
    date: transaction.date.slice(0, 10),
    note: transaction.description ?? "",
    recurringSeriesId: transaction.recurringSeries?.id ?? null,
    recurrenceFrequency:
      transaction.recurringSeries?.frequency === "DAILY"
        ? "daily"
        : transaction.recurringSeries?.frequency === "WEEKLY"
          ? "weekly"
          : transaction.recurringSeries?.frequency === "MONTHLY"
            ? "monthly"
            : null,
    recurringSeriesStatus:
      transaction.recurringSeries === null
        ? null
        : transaction.recurringSeries.isPaused
          ? "paused"
          : "active",
  };
};

// ── Shared error helpers ──────────────────────────────────────────────────────

export const getSafeCreateErrorMessage = (
  operation:
    | "spending-category"
    | "saving-category"
    | "transaction"
    | "income-source",
  status?: number,
) => {
  if (operation === "spending-category") {
    if (status === 400) {
      return "Unable to create spending category. Please review the name and limit.";
    }
    return "Unable to create spending category right now.";
  }

  if (operation === "saving-category") {
    if (status === 400) {
      return "Unable to create savings category. Please review the name and limit.";
    }
    return "Unable to create savings category right now.";
  }

  if (operation === "transaction") {
    if (status === 400) {
      return "Unable to create transaction. Please review the amount, date, and category.";
    }
    return "Unable to create transaction right now.";
  }

  if (status === 400) {
    return "Unable to create income source. Please review the name, amount, and tax settings.";
  }
  return "Unable to create income source right now.";
};
