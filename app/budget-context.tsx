"use client";

import { createContext, ReactNode, useContext, useEffect, useState } from "react";

export type Category = {
  id: string;
  name: string;
  limitType: "amount" | "percent";
  limitValue: number;
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
  taxType: "pre" | "post";
  taxMethod: "manual" | "auto";
  taxState: "CA" | "TX" | "MA" | null;
  taxRate: number;
  postTaxAmount: number;
};

export type IncomeInput = {
  source: string;
  amount: number;
  taxType: "pre" | "post";
  taxMethod: "manual" | "auto";
  taxState: "CA" | "TX" | "MA" | null;
  taxRate: number;
};

type BudgetContextValue = {
  categories: Category[];
  savingCategories: Category[];
  transactions: Transaction[];
  incomes: Income[];
  addCategory: (
    name: string,
    limitType: "amount" | "percent",
    limitValue: number,
  ) => Promise<boolean>;
  updateCategoryLimit: (
    id: string,
    limitType: "amount" | "percent",
    limitValue: number,
  ) => Promise<void>;
  updateCategoryName: (id: string, nextName: string) => Promise<boolean>;
  deleteCategory: (id: string) => Promise<void>;
  addSavingCategory: (
    name: string,
    limitType: "amount" | "percent",
    limitValue: number,
  ) => Promise<boolean>;
  updateSavingCategoryLimit: (
    id: string,
    limitType: "amount" | "percent",
    limitValue: number,
  ) => Promise<void>;
  updateSavingCategoryName: (id: string, nextName: string) => Promise<boolean>;
  deleteSavingCategory: (id: string) => Promise<void>;
  addTransaction: (transaction: TransactionInput) => Promise<void>;
  updateTransaction: (
    id: string,
    transaction: TransactionInput,
    scope?: RecurrenceScope,
  ) => Promise<void>;
  deleteTransaction: (id: string, scope?: RecurrenceScope) => Promise<void>;
  addIncome: (income: IncomeInput) => Promise<void>;
  updateIncome: (id: string, income: IncomeInput) => Promise<void>;
  deleteIncome: (id: string) => Promise<void>;
  resetData: () => Promise<void>;
};

const BudgetContext = createContext<BudgetContextValue | null>(null);

type ApiIncome = {
  id: string;
  name: string;
  amount: number;
  frequency: "MONTHLY" | "ANNUAL";
  isPreTax: boolean;
  taxRate: number | null;
  taxState: "CA" | "TX" | "MA" | null;
};

type ApiCategory = {
  id: string;
  name: string;
  limitType: "AMOUNT" | "PERCENT";
  limitValue: number;
};

type ApiSavingCategory = {
  id: string;
  name: string;
  limitType: "AMOUNT" | "PERCENT";
  limitValue: number;
};

type ApiTransaction = {
  id: string;
  amount: number;
  date: string;
  description: string | null;
  categoryId: string;
  category: { id: string; name: string };
  recurringSeries: { id: string; frequency: "DAILY" | "WEEKLY" | "MONTHLY" } | null;
};

const toIncome = (income: ApiIncome): Income => {
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
    taxType: income.isPreTax ? "pre" : "post",
    taxMethod: income.isPreTax && income.taxState ? "auto" : "manual",
    taxState: income.taxState,
    taxRate,
    postTaxAmount,
  };
};

const toCategory = (category: ApiCategory): Category => ({
  id: category.id,
  name: category.name,
  limitType: category.limitType === "AMOUNT" ? "amount" : "percent",
  limitValue: category.limitValue,
});

const toTransaction = (transaction: ApiTransaction): Transaction => ({
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
});

export function BudgetProvider({ children }: { children: ReactNode }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [savingCategories, setSavingCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);

  useEffect(() => {
    let isActive = true;

    const load = async () => {
      const [
        categoriesResponse,
        savingCategoriesResponse,
        transactionsResponse,
        incomesResponse,
      ] =
        await Promise.all([
          fetch("/api/spending-categories", { cache: "no-store" }),
          fetch("/api/saving-categories", { cache: "no-store" }),
          fetch("/api/transactions", { cache: "no-store" }),
          fetch("/api/income-sources", { cache: "no-store" }),
        ]);

      if (
        !isActive ||
        !categoriesResponse.ok ||
        !savingCategoriesResponse.ok ||
        !transactionsResponse.ok ||
        !incomesResponse.ok
      ) {
        return;
      }

      const [categoriesData, savingCategoriesData, transactionsData, incomesData] =
        await Promise.all([
        categoriesResponse.json() as Promise<ApiCategory[]>,
        savingCategoriesResponse.json() as Promise<ApiSavingCategory[]>,
        transactionsResponse.json() as Promise<ApiTransaction[]>,
        incomesResponse.json() as Promise<ApiIncome[]>,
      ]);

      if (!isActive) return;
      setCategories(categoriesData.map(toCategory));
      setSavingCategories(savingCategoriesData.map(toCategory));
      setTransactions(transactionsData.map(toTransaction));
      setIncomes(incomesData.map(toIncome));
    };

    void load();
    return () => {
      isActive = false;
    };
  }, []);

  const refreshTransactions = async () => {
    const response = await fetch("/api/transactions", { cache: "no-store" });
    if (!response.ok) return;
    const transactionsData = (await response.json()) as ApiTransaction[];
    setTransactions(transactionsData.map(toTransaction));
  };

  const addCategory = async (
    name: string,
    limitType: "amount" | "percent",
    limitValue: number,
  ) => {
    const nextName = name.trim();
    if (!nextName || limitValue <= 0) return false;

    const exists = categories.some(
      (category) => category.name.toLowerCase() === nextName.toLowerCase(),
    );
    if (exists) return false;

    const response = await fetch("/api/spending-categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: nextName,
        limitType: limitType === "amount" ? "AMOUNT" : "PERCENT",
        limitValue,
      }),
    });
    if (!response.ok) return false;

    const created = (await response.json()) as ApiCategory;
    setCategories((current) => [toCategory(created), ...current]);
    return true;
  };

  const updateCategoryLimit = async (
    id: string,
    limitType: "amount" | "percent",
    limitValue: number,
  ) => {
    if (limitValue <= 0) return;

    const response = await fetch(`/api/spending-categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        limitType: limitType === "amount" ? "AMOUNT" : "PERCENT",
        limitValue,
      }),
    });
    if (!response.ok) return;

    const updated = (await response.json()) as ApiCategory;
    setCategories((current) =>
      current.map((category) => (category.id === id ? toCategory(updated) : category)),
    );
  };

  const updateCategoryName = async (id: string, nextName: string) => {
    const trimmedName = nextName.trim();
    if (!trimmedName) return false;

    const response = await fetch(`/api/spending-categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmedName }),
    });
    if (!response.ok) return false;

    const updated = (await response.json()) as ApiCategory;
    setCategories((current) =>
      current.map((category) => (category.id === id ? toCategory(updated) : category)),
    );
    setTransactions((current) =>
      current.map((transaction) =>
        transaction.categoryId === id
          ? { ...transaction, categoryName: updated.name }
          : transaction,
      ),
    );
    return true;
  };

  const deleteCategory = async (id: string) => {
    const response = await fetch(`/api/spending-categories/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) return;

    setCategories((current) => current.filter((category) => category.id !== id));
    setTransactions((current) =>
      current.filter((transaction) => transaction.categoryId !== id),
    );
  };

  const addSavingCategory = async (
    name: string,
    limitType: "amount" | "percent",
    limitValue: number,
  ) => {
    const nextName = name.trim();
    if (!nextName || limitValue <= 0) return false;

    const exists = savingCategories.some(
      (category) => category.name.toLowerCase() === nextName.toLowerCase(),
    );
    if (exists) return false;

    const response = await fetch("/api/saving-categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: nextName,
        limitType: limitType === "amount" ? "AMOUNT" : "PERCENT",
        limitValue,
      }),
    });
    if (!response.ok) return false;

    const created = (await response.json()) as ApiSavingCategory;
    setSavingCategories((current) => [toCategory(created), ...current]);
    return true;
  };

  const updateSavingCategoryLimit = async (
    id: string,
    limitType: "amount" | "percent",
    limitValue: number,
  ) => {
    if (limitValue <= 0) return;

    const response = await fetch(`/api/saving-categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        limitType: limitType === "amount" ? "AMOUNT" : "PERCENT",
        limitValue,
      }),
    });
    if (!response.ok) return;

    const updated = (await response.json()) as ApiSavingCategory;
    setSavingCategories((current) =>
      current.map((category) => (category.id === id ? toCategory(updated) : category)),
    );
  };

  const updateSavingCategoryName = async (id: string, nextName: string) => {
    const trimmedName = nextName.trim();
    if (!trimmedName) return false;

    const response = await fetch(`/api/saving-categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmedName }),
    });
    if (!response.ok) return false;

    const updated = (await response.json()) as ApiSavingCategory;
    setSavingCategories((current) =>
      current.map((category) => (category.id === id ? toCategory(updated) : category)),
    );
    return true;
  };

  const deleteSavingCategory = async (id: string) => {
    const response = await fetch(`/api/saving-categories/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) return;

    setSavingCategories((current) =>
      current.filter((category) => category.id !== id),
    );
  };

  const addTransaction = async (transaction: TransactionInput) => {
    const response = await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: transaction.amount,
        categoryId: transaction.categoryId,
        date: transaction.date,
        description: transaction.note || null,
        isRecurring: transaction.isRecurring === true,
        recurrenceFrequency: transaction.recurrenceFrequency?.toUpperCase(),
      }),
    });
    if (!response.ok) return;
    await refreshTransactions();
  };

  const updateTransaction = async (
    id: string,
    transaction: TransactionInput,
    scope: RecurrenceScope = "this",
  ) => {
    const response = await fetch(`/api/transactions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: transaction.amount,
        categoryId: transaction.categoryId,
        date: transaction.date,
        description: transaction.note || null,
        recurrenceFrequency: transaction.recurrenceFrequency?.toUpperCase(),
        scope: scope.toUpperCase(),
      }),
    });
    if (!response.ok) return;
    await refreshTransactions();
  };

  const deleteTransaction = async (id: string, scope: RecurrenceScope = "this") => {
    const response = await fetch(`/api/transactions/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scope: scope.toUpperCase(),
      }),
    });
    if (!response.ok) return;
    await refreshTransactions();
  };

  const addIncome = async (income: IncomeInput) => {
    const isPreTax = income.taxType === "pre";
    const incomePayload: {
      name: string;
      amount: number;
      frequency: "MONTHLY";
      isPreTax: boolean;
      taxRate?: number;
      taxState?: "CA" | "TX" | "MA";
    } = {
      name: income.source,
      amount: income.amount,
      frequency: "MONTHLY",
      isPreTax,
    };
    if (isPreTax) {
      incomePayload.taxRate = income.taxRate;
      if (income.taxMethod === "auto" && income.taxState) {
        incomePayload.taxState = income.taxState;
      }
    }

    const response = await fetch("/api/income-sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(incomePayload),
    });
    if (!response.ok) return;

    const created = (await response.json()) as ApiIncome;
    setIncomes((current) => [toIncome(created), ...current]);
  };

  const updateIncome = async (id: string, income: IncomeInput) => {
    const isPreTax = income.taxType === "pre";
    const incomePayload: {
      name: string;
      amount: number;
      frequency: "MONTHLY";
      isPreTax: boolean;
      taxRate?: number;
      taxState?: "CA" | "TX" | "MA";
    } = {
      name: income.source,
      amount: income.amount,
      frequency: "MONTHLY",
      isPreTax,
    };
    if (isPreTax) {
      incomePayload.taxRate = income.taxRate;
      if (income.taxMethod === "auto" && income.taxState) {
        incomePayload.taxState = income.taxState;
      }
    }

    const response = await fetch(`/api/income-sources/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(incomePayload),
    });
    if (!response.ok) return;

    const updated = (await response.json()) as ApiIncome;
    setIncomes((current) =>
      current.map((item) => (item.id === id ? toIncome(updated) : item)),
    );
  };

  const deleteIncome = async (id: string) => {
    const response = await fetch(`/api/income-sources/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) return;

    setIncomes((current) => current.filter((item) => item.id !== id));
  };

  const resetData = async () => {
    const response = await fetch("/api/reset-data", {
      method: "DELETE",
    });
    if (!response.ok) return;

    setCategories([]);
    setSavingCategories([]);
    setTransactions([]);
    setIncomes([]);
  };

  return (
    <BudgetContext.Provider
      value={{
        categories,
        savingCategories,
        transactions,
        incomes,
        addCategory,
        updateCategoryLimit,
        updateCategoryName,
        deleteCategory,
        addSavingCategory,
        updateSavingCategoryLimit,
        updateSavingCategoryName,
        deleteSavingCategory,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        addIncome,
        updateIncome,
        deleteIncome,
        resetData,
      }}
    >
      {children}
    </BudgetContext.Provider>
  );
}

export function useBudget() {
  const context = useContext(BudgetContext);
  if (!context) {
    throw new Error("useBudget must be used within BudgetProvider");
  }
  return context;
}
