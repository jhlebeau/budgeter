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

type BudgetContextValue = {
  categories: Category[];
  transactions: Transaction[];
  addCategory: (name: string, monthlyLimit: number) => boolean;
  updateCategoryLimit: (name: string, monthlyLimit: number) => void;
  addTransaction: (transaction: TransactionInput) => void;
  updateTransaction: (id: number, transaction: TransactionInput) => void;
};

const BudgetContext = createContext<BudgetContextValue | null>(null);

export function BudgetProvider({ children }: { children: ReactNode }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

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

  const addTransaction = (transaction: TransactionInput) => {
    setTransactions((current) => [{ id: Date.now(), ...transaction }, ...current]);
  };

  const updateTransaction = (id: number, transaction: TransactionInput) => {
    setTransactions((current) =>
      current.map((item) => (item.id === id ? { ...item, ...transaction } : item)),
    );
  };

  return (
    <BudgetContext.Provider
      value={{
        categories,
        transactions,
        addCategory,
        updateCategoryLimit,
        addTransaction,
        updateTransaction,
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
