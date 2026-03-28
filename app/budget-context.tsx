"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  ApiCategory,
  ApiIncome,
  ApiSavingCategory,
  AppUser,
  Category,
  Income,
  IncomeInput,
  RecurrenceScope,
  TransactionInput,
} from "@/lib/budget-types";
import { toCategory, toIncome } from "@/lib/budget-types";
import { useCategories } from "./hooks/useCategories";
import { useSavingCategories } from "./hooks/useSavingCategories";
import { useIncomes } from "./hooks/useIncomes";
import { useTransactions } from "./hooks/useTransactions";

export type {
  AppUser,
  Category,
  Income,
  IncomeInput,
  RecurrenceScope,
  TransactionInput,
} from "@/lib/budget-types";
export type { Transaction, ApiTransaction } from "@/lib/budget-types";
export { toTransaction } from "@/lib/budget-types";

type BudgetContextValue = {
  currentUser: AppUser | null;
  sessionLoading: boolean;
  setCurrentUser: (user: AppUser | null) => void;
  logout: () => Promise<void>;
  categories: Category[];
  savingCategories: Category[];
  incomes: Income[];
  addCategory: (
    name: string,
    limitType: "amount" | "percent",
    limitValue: number,
  ) => Promise<string | null>;
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
  ) => Promise<string | null>;
  updateSavingCategoryLimit: (
    id: string,
    limitType: "amount" | "percent",
    limitValue: number,
  ) => Promise<void>;
  updateSavingCategoryName: (id: string, nextName: string) => Promise<boolean>;
  deleteSavingCategory: (id: string) => Promise<void>;
  addTransaction: (transaction: TransactionInput) => Promise<string | null>;
  updateTransaction: (
    id: string,
    transaction: TransactionInput,
    scope?: RecurrenceScope,
  ) => Promise<void>;
  deleteTransaction: (id: string, scope?: RecurrenceScope) => Promise<void>;
  addIncome: (income: IncomeInput) => Promise<string | null>;
  updateIncome: (id: string, income: IncomeInput) => Promise<void>;
  deleteIncome: (id: string) => Promise<void>;
  resetData: () => Promise<void>;
};

const BudgetContext = createContext<BudgetContextValue | null>(null);

export function BudgetProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUserState] = useState<AppUser | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => (r.ok ? r.json() : null))
      .then((user: AppUser | null) => {
        if (user) setCurrentUserState(user);
      })
      .catch(() => null)
      .finally(() => setSessionLoading(false));
  }, []);

  const authFetch = useCallback(async (url: string, init?: RequestInit) => {
    if (!currentUser) return null;
    return fetch(url, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });
  }, [currentUser]);

  const categoryHook = useCategories(authFetch);
  const savingCategoryHook = useSavingCategories(authFetch);
  const incomeHook = useIncomes(authFetch);
  const transactionHook = useTransactions(authFetch);

  // Load all data when user signs in
  useEffect(() => {
    if (!currentUser) return;

    let isActive = true;

    const load = async () => {
      const [catRes, savingCatRes, incomeRes] = await Promise.all([
        authFetch("/api/spending-categories", { cache: "no-store" }),
        authFetch("/api/saving-categories", { cache: "no-store" }),
        authFetch("/api/income-sources", { cache: "no-store" }),
      ]);

      if (
        !catRes?.ok ||
        !savingCatRes?.ok ||
        !incomeRes?.ok ||
        !isActive
      ) return;

      const [catData, savingCatData, incomeData] = await Promise.all([
        catRes.json() as Promise<ApiCategory[]>,
        savingCatRes.json() as Promise<ApiSavingCategory[]>,
        incomeRes.json() as Promise<ApiIncome[]>,
      ]);

      if (!isActive) return;
      categoryHook.setCategories(catData.map(toCategory));
      savingCategoryHook.setSavingCategories(savingCatData.map(toCategory));
      incomeHook.setIncomes(incomeData.map(toIncome));
    };

    void load();
    return () => { isActive = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  const setCurrentUser = (user: AppUser | null) => {
    categoryHook.clear();
    savingCategoryHook.clear();
    incomeHook.clear();
    setCurrentUserState(user);
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setCurrentUser(null);
  };

  const resetData = async () => {
    const response = await authFetch("/api/reset-data", { method: "DELETE" });
    if (!response || !response.ok) return;
    categoryHook.clear();
    savingCategoryHook.clear();
    incomeHook.clear();
  };

  return (
    <BudgetContext.Provider
      value={{
        currentUser,
        sessionLoading,
        setCurrentUser,
        logout,
        categories: categoryHook.categories,
        savingCategories: savingCategoryHook.savingCategories,
        incomes: incomeHook.incomes,
        addCategory: categoryHook.addCategory,
        updateCategoryLimit: categoryHook.updateCategoryLimit,
        updateCategoryName: categoryHook.updateCategoryName,
        deleteCategory: categoryHook.deleteCategory,
        addSavingCategory: savingCategoryHook.addSavingCategory,
        updateSavingCategoryLimit: savingCategoryHook.updateSavingCategoryLimit,
        updateSavingCategoryName: savingCategoryHook.updateSavingCategoryName,
        deleteSavingCategory: savingCategoryHook.deleteSavingCategory,
        addTransaction: transactionHook.addTransaction,
        updateTransaction: transactionHook.updateTransaction,
        deleteTransaction: transactionHook.deleteTransaction,
        addIncome: incomeHook.addIncome,
        updateIncome: incomeHook.updateIncome,
        deleteIncome: incomeHook.deleteIncome,
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
