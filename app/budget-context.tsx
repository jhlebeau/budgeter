"use client";

import { createContext, ReactNode, useContext, useState } from "react";

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
  categories: string[];
  transactions: Transaction[];
  addCategory: (value: string) => boolean;
  addTransaction: (transaction: TransactionInput) => void;
  updateTransaction: (id: number, transaction: TransactionInput) => void;
};

const BudgetContext = createContext<BudgetContextValue | null>(null);

export function BudgetProvider({ children }: { children: ReactNode }) {
  const [categories, setCategories] = useState<string[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const addCategory = (value: string) => {
    const next = value.trim();
    if (!next) return false;

    const exists = categories.some(
      (category) => category.toLowerCase() === next.toLowerCase(),
    );
    if (exists) return false;

    setCategories((current) => [...current, next]);
    return true;
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
