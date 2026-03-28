"use client";

import { useCallback } from "react";
import {
  getSafeCreateErrorMessage,
  RecurrenceScope,
  TransactionInput,
} from "@/lib/budget-types";

type AuthFetch = (url: string, init?: RequestInit) => Promise<Response | null>;

export function useTransactions(authFetch: AuthFetch) {
  const addTransaction = useCallback(
    async (transaction: TransactionInput): Promise<string | null> => {
      const response = await authFetch("/api/transactions", {
        method: "POST",
        body: JSON.stringify({
          amount: transaction.amount,
          categoryId: transaction.categoryId,
          date: transaction.date,
          description: transaction.note || null,
          isRecurring: transaction.isRecurring === true,
          recurrenceFrequency: transaction.recurrenceFrequency?.toUpperCase(),
        }),
      });
      if (!response) return getSafeCreateErrorMessage("transaction");
      if (!response.ok) {
        return getSafeCreateErrorMessage("transaction", response.status);
      }
      return null;
    },
    [authFetch],
  );

  const updateTransaction = useCallback(
    async (
      id: string,
      transaction: TransactionInput,
      scope: RecurrenceScope = "this",
    ) => {
      const response = await authFetch(`/api/transactions/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          amount: transaction.amount,
          categoryId: transaction.categoryId,
          date: transaction.date,
          description: transaction.note || null,
          recurrenceFrequency: transaction.recurrenceFrequency?.toUpperCase(),
          scope: scope.toUpperCase(),
        }),
      });
      if (!response || !response.ok) return;
    },
    [authFetch],
  );

  const deleteTransaction = useCallback(
    async (id: string, scope: RecurrenceScope = "this") => {
      const response = await authFetch(`/api/transactions/${id}`, {
        method: "DELETE",
        body: JSON.stringify({ scope: scope.toUpperCase() }),
      });
      if (!response || !response.ok) return;
    },
    [authFetch],
  );

  return { addTransaction, updateTransaction, deleteTransaction };
}
