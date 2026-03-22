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
  updateCategoryName: (currentName: string, nextName: string) => boolean;
  deleteCategory: (name: string) => void;
  addTransaction: (transaction: TransactionInput) => void;
  updateTransaction: (id: number, transaction: TransactionInput) => void;
  deleteTransaction: (id: number) => void;
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

  return (
    <BudgetContext.Provider
      value={{
        categories,
        transactions,
        addCategory,
        updateCategoryLimit,
        updateCategoryName,
        deleteCategory,
        addTransaction,
        updateTransaction,
        deleteTransaction,
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
