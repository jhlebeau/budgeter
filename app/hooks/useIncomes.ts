"use client";

import { useCallback, useState } from "react";
import {
  ApiIncome,
  getSafeCreateErrorMessage,
  Income,
  IncomeInput,
  toIncome,
} from "@/lib/budget-types";
import { TaxStateCode } from "@/lib/tax-states";
import {
  ENTRY_NAME_ALLOWED_CHARACTERS_MESSAGE,
  NAME_MAX_LENGTH,
  parseEntryName,
} from "@/lib/input-validation";

type AuthFetch = (url: string, init?: RequestInit) => Promise<Response | null>;

export function useIncomes(authFetch: AuthFetch) {
  const [incomes, setIncomes] = useState<Income[]>([]);

  const refresh = useCallback(async () => {
    const response = await authFetch("/api/income-sources", { cache: "no-store" });
    if (!response || !response.ok) return;
    const data = (await response.json()) as ApiIncome[];
    setIncomes(data.map(toIncome));
  }, [authFetch]);

  const clear = useCallback(() => setIncomes([]), []);

  const buildIncomePayload = (income: IncomeInput) => {
    const isPreTax = income.taxType === "pre";
    const payload: {
      name: string;
      amount: number;
      frequency: "MONTHLY" | "ANNUAL";
      startMonth: string;
      endMonth: string | null;
      isPreTax: boolean;
      taxRate?: number;
      taxState?: TaxStateCode;
    } = {
      name: income.source,
      amount: income.amount,
      frequency: income.period === "annual" ? "ANNUAL" : "MONTHLY",
      startMonth: income.startMonth,
      endMonth: income.endMonth,
      isPreTax,
    };
    if (isPreTax) {
      payload.taxRate = income.taxRate;
      if (income.taxMethod === "auto" && income.taxState) {
        payload.taxState = income.taxState;
      }
    }
    return payload;
  };

  const addIncome = useCallback(
    async (income: IncomeInput): Promise<string | null> => {
      const nextName = parseEntryName(income.source, NAME_MAX_LENGTH);
      if (!nextName) {
        return `Enter a valid income source name. ${ENTRY_NAME_ALLOWED_CHARACTERS_MESSAGE}`;
      }

      const exists = incomes.some(
        (existing) => existing.source.toLowerCase() === nextName.toLowerCase(),
      );
      if (exists) {
        return `An income source named "${nextName}" already exists.`;
      }

      const response = await authFetch("/api/income-sources", {
        method: "POST",
        body: JSON.stringify({ ...buildIncomePayload(income), name: nextName }),
      });
      if (!response) return getSafeCreateErrorMessage("income-source");
      if (!response.ok) {
        return getSafeCreateErrorMessage("income-source", response.status);
      }

      const created = (await response.json()) as ApiIncome;
      setIncomes((current) => [toIncome(created), ...current]);
      return null;
    },
    [authFetch, incomes],
  );

  const updateIncome = useCallback(
    async (id: string, income: IncomeInput): Promise<boolean> => {
      const response = await authFetch(`/api/income-sources/${id}`, {
        method: "PATCH",
        body: JSON.stringify(buildIncomePayload(income)),
      });
      if (!response || !response.ok) return false;

      const updated = (await response.json()) as ApiIncome;
      setIncomes((current) =>
        current.map((item) => (item.id === id ? toIncome(updated) : item)),
      );
      return true;
    },
    [authFetch],
  );

  const deleteIncome = useCallback(
    async (id: string): Promise<boolean> => {
      const response = await authFetch(`/api/income-sources/${id}`, {
        method: "DELETE",
      });
      if (!response || !response.ok) return false;
      setIncomes((current) => current.filter((item) => item.id !== id));
      return true;
    },
    [authFetch],
  );

  return {
    incomes,
    setIncomes,
    refresh,
    clear,
    addIncome,
    updateIncome,
    deleteIncome,
  };
}
