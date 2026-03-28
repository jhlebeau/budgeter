"use client";

import { useCallback, useState } from "react";
import {
  ApiSavingCategory,
  Category,
  getSafeCreateErrorMessage,
  toCategory,
} from "@/lib/budget-types";
import {
  CATEGORY_NAME_MAX_LENGTH,
  parseEntryName,
} from "@/lib/input-validation";

type AuthFetch = (url: string, init?: RequestInit) => Promise<Response | null>;

export function useSavingCategories(authFetch: AuthFetch) {
  const [savingCategories, setSavingCategories] = useState<Category[]>([]);

  const refresh = useCallback(async () => {
    const response = await authFetch("/api/saving-categories", { cache: "no-store" });
    if (!response || !response.ok) return;
    const data = (await response.json()) as ApiSavingCategory[];
    setSavingCategories(data.map(toCategory));
  }, [authFetch]);

  const clear = useCallback(() => setSavingCategories([]), []);

  const addSavingCategory = useCallback(
    async (
      name: string,
      limitType: "amount" | "percent",
      limitValue: number,
    ): Promise<string | null> => {
      const nextName = parseEntryName(name, CATEGORY_NAME_MAX_LENGTH);
      if (!nextName || limitValue < 0) {
        return `Savings category names can only use letters, numbers, spaces, underscores, and dashes, and the limit must be non-negative.`;
      }

      const exists = savingCategories.some(
        (category) => category.name.toLowerCase() === nextName.toLowerCase(),
      );
      if (exists) {
        return `A savings category named "${nextName}" already exists.`;
      }

      const response = await authFetch("/api/saving-categories", {
        method: "POST",
        body: JSON.stringify({
          name: nextName,
          limitType: limitType === "amount" ? "AMOUNT" : "PERCENT",
          limitValue,
        }),
      });
      if (!response) return getSafeCreateErrorMessage("saving-category");
      if (!response.ok) {
        return getSafeCreateErrorMessage("saving-category", response.status);
      }

      const created = (await response.json()) as ApiSavingCategory;
      setSavingCategories((current) => [toCategory(created), ...current]);
      return null;
    },
    [authFetch, savingCategories],
  );

  const updateSavingCategoryLimit = useCallback(
    async (
      id: string,
      limitType: "amount" | "percent",
      limitValue: number,
    ): Promise<boolean> => {
      if (limitValue < 0) return false;

      const response = await authFetch(`/api/saving-categories/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          limitType: limitType === "amount" ? "AMOUNT" : "PERCENT",
          limitValue,
        }),
      });
      if (!response || !response.ok) return false;

      const updated = (await response.json()) as ApiSavingCategory;
      setSavingCategories((current) =>
        current.map((category) =>
          category.id === id ? toCategory(updated) : category,
        ),
      );
      return true;
    },
    [authFetch],
  );

  const updateSavingCategoryName = useCallback(
    async (id: string, nextName: string): Promise<boolean> => {
      const trimmedName = parseEntryName(nextName, CATEGORY_NAME_MAX_LENGTH);
      if (!trimmedName) return false;

      const response = await authFetch(`/api/saving-categories/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ name: trimmedName }),
      });
      if (!response || !response.ok) return false;

      const updated = (await response.json()) as ApiSavingCategory;
      setSavingCategories((current) =>
        current.map((category) =>
          category.id === id ? toCategory(updated) : category,
        ),
      );
      return true;
    },
    [authFetch],
  );

  const deleteSavingCategory = useCallback(
    async (id: string): Promise<boolean> => {
      const response = await authFetch(`/api/saving-categories/${id}`, {
        method: "DELETE",
      });
      if (!response || !response.ok) return false;
      setSavingCategories((current) =>
        current.filter((category) => category.id !== id),
      );
      return true;
    },
    [authFetch],
  );

  return {
    savingCategories,
    setSavingCategories,
    refresh,
    clear,
    addSavingCategory,
    updateSavingCategoryLimit,
    updateSavingCategoryName,
    deleteSavingCategory,
  };
}
