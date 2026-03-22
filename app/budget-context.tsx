"use client";

import { createContext, ReactNode, useContext, useState } from "react";

export type Category = {
  name: string;
  monthlyLimit: number;
};

export type Transaction = {
  id: number;
  amount: number;
  category: string;
  date: string;
  note: string;
};

export type TransactionInput = {
  amount: number;
  category: string;
  date: string;
  note: string;
};

export type Income = {
  id: number;
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
  transactions: Transaction[];
  incomes: Income[];
  addCategory: (name: string, monthlyLimit: number) => boolean;
  updateCategoryLimit: (name: string, monthlyLimit: number) => void;
  updateCategoryName: (currentName: string, nextName: string) => boolean;
  deleteCategory: (name: string) => void;
  addTransaction: (transaction: TransactionInput) => void;
  updateTransaction: (id: number, transaction: TransactionInput) => void;
  deleteTransaction: (id: number) => void;
  addIncome: (income: IncomeInput) => void;
  updateIncome: (id: number, income: IncomeInput) => void;
  deleteIncome: (id: number) => void;
};

const BudgetContext = createContext<BudgetContextValue | null>(null);

export function BudgetProvider({ children }: { children: ReactNode }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);

  const addCategory = (name: string, monthlyLimit: number) => {
    const nextName = name.trim();
    if (!nextName || monthlyLimit <= 0) return false;

    const exists = categories.some(
      (category) => category.name.toLowerCase() === nextName.toLowerCase(),
    );
    if (exists) return false;

    setCategories((current) => [...current, { name: nextName, monthlyLimit }]);
    return true;
  };

  const updateCategoryLimit = (name: string, monthlyLimit: number) => {
    if (monthlyLimit <= 0) return;

    setCategories((current) =>
      current.map((category) =>
        category.name === name ? { ...category, monthlyLimit } : category,
      ),
    );
  };

  const updateCategoryName = (currentName: string, nextName: string) => {
    const trimmedName = nextName.trim();
    if (!trimmedName) return false;

    const exists = categories.some(
      (category) =>
        category.name.toLowerCase() === trimmedName.toLowerCase() &&
        category.name !== currentName,
    );
    if (exists) return false;

    setCategories((current) =>
      current.map((category) =>
        category.name === currentName
          ? { ...category, name: trimmedName }
          : category,
      ),
    );

    setTransactions((current) =>
      current.map((transaction) =>
        transaction.category === currentName
          ? { ...transaction, category: trimmedName }
          : transaction,
      ),
    );

    return true;
  };

  const deleteCategory = (name: string) => {
    setCategories((current) =>
      current.filter((category) => category.name !== name),
    );
    setTransactions((current) =>
      current.filter((transaction) => transaction.category !== name),
    );
  };

  const addTransaction = (transaction: TransactionInput) => {
    setTransactions((current) => [{ id: Date.now(), ...transaction }, ...current]);
  };

  const updateTransaction = (id: number, transaction: TransactionInput) => {
    setTransactions((current) =>
      current.map((item) => (item.id === id ? { ...item, ...transaction } : item)),
    );
  };

  const deleteTransaction = (id: number) => {
    setTransactions((current) => current.filter((item) => item.id !== id));
  };

  const addIncome = (income: IncomeInput) => {
    const amount = Math.max(0, income.amount);
    const safeTaxRate = Math.max(0, Math.min(100, income.taxRate));
    const postTaxAmount =
      income.taxType === "pre" ? amount * (1 - safeTaxRate / 100) : amount;

    setIncomes((current) => [
      {
        id: Date.now(),
        source: income.source.trim(),
        amount,
        taxType: income.taxType,
        taxMethod: income.taxMethod,
        taxState: income.taxState,
        taxRate: safeTaxRate,
        postTaxAmount,
      },
      ...current,
    ]);
  };

  const updateIncome = (id: number, income: IncomeInput) => {
    const amount = Math.max(0, income.amount);
    const safeTaxRate = Math.max(0, Math.min(100, income.taxRate));
    const postTaxAmount =
      income.taxType === "pre" ? amount * (1 - safeTaxRate / 100) : amount;

    setIncomes((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              source: income.source.trim(),
              amount,
              taxType: income.taxType,
              taxMethod: income.taxMethod,
              taxState: income.taxState,
              taxRate: safeTaxRate,
              postTaxAmount,
            }
          : item,
      ),
    );
  };

  const deleteIncome = (id: number) => {
    setIncomes((current) => current.filter((item) => item.id !== id));
  };

  return (
    <BudgetContext.Provider
      value={{
        categories,
        transactions,
        incomes,
        addCategory,
        updateCategoryLimit,
        updateCategoryName,
        deleteCategory,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        addIncome,
        updateIncome,
        deleteIncome,
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
