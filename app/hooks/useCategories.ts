"use client";

import { useCallback, useState } from "react";
import {
  ApiCategory,
  Category,
  getSafeCreateErrorMessage,
  toCategory,
} from "@/lib/budget-types";
import { UNASSIGNED_CATEGORY_NAME } from "@/lib/spending-category-constants";
import {
  CATEGORY_NAME_MAX_LENGTH,
  parseEntryName,
} from "@/lib/input-validation";

type AuthFetch = (url: string, init?: RequestInit) => Promise<Response | null>;

export function useCategories(authFetch: AuthFetch) {
  const [categories, setCategories] = useState<Category[]>([]);

  const refresh = useCallback(async () => {
    const response = await authFetch("/api/spending-categories", { cache: "no-store" });
    if (!response || !response.ok) return;
    const data = (await response.json()) as ApiCategory[];
    setCategories(data.map(toCategory));
  }, [authFetch]);

  const clear = useCallback(() => setCategories([]), []);

  const addCategory = useCallback(
    async (
      name: string,
      limitType: "amount" | "percent",
      limitValue: number,
    ): Promise<string | null> => {
      const nextName = parseEntryName(name, CATEGORY_NAME_MAX_LENGTH);
      if (!nextName || limitValue < 0) {
        return `Category names can only use letters, numbers, spaces, underscores, and dashes, and the limit must be non-negative.`;
      }
      if (nextName.toLowerCase() === UNASSIGNED_CATEGORY_NAME.toLowerCase()) {
        return `"${UNASSIGNED_CATEGORY_NAME}" is reserved and cannot be used.`;
      }

      const exists = categories.some(
        (category) => category.name.toLowerCase() === nextName.toLowerCase(),
      );
      if (exists) {
        return `A spending category named "${nextName}" already exists.`;
      }

      const response = await authFetch("/api/spending-categories", {
        method: "POST",
        body: JSON.stringify({
          name: nextName,
          limitType: limitType === "amount" ? "AMOUNT" : "PERCENT",
          limitValue,
        }),
      });
      if (!response) return getSafeCreateErrorMessage("spending-category");
      if (!response.ok) {
        return getSafeCreateErrorMessage("spending-category", response.status);
      }

      const created = (await response.json()) as ApiCategory;
      setCategories((current) => [toCategory(created), ...current]);
      return null;
    },
    [authFetch, categories],
  );

  const updateCategoryLimit = useCallback(
    async (
      id: string,
      limitType: "amount" | "percent",
      limitValue: number,
    ) => {
      if (limitValue < 0) return;

      const response = await authFetch(`/api/spending-categories/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          limitType: limitType === "amount" ? "AMOUNT" : "PERCENT",
          limitValue,
        }),
      });
      if (!response || !response.ok) return;

      const updated = (await response.json()) as ApiCategory;
      setCategories((current) =>
        current.map((category) =>
          category.id === id ? toCategory(updated) : category,
        ),
      );
    },
    [authFetch],
  );

  const updateCategoryName = useCallback(
    async (id: string, nextName: string): Promise<boolean> => {
      const trimmedName = parseEntryName(nextName, CATEGORY_NAME_MAX_LENGTH);
      if (!trimmedName) return false;

      const response = await authFetch(`/api/spending-categories/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ name: trimmedName }),
      });
      if (!response || !response.ok) return false;

      const updated = (await response.json()) as ApiCategory;
      setCategories((current) =>
        current.map((category) =>
          category.id === id ? toCategory(updated) : category,
        ),
      );
      return true;
    },
    [authFetch],
  );

  const deleteCategory = useCallback(
    async (id: string) => {
      const response = await authFetch(`/api/spending-categories/${id}`, {
        method: "DELETE",
      });
      if (!response || !response.ok) return;
      await refresh();
    },
    [authFetch, refresh],
  );

  return {
    categories,
    setCategories,
    refresh,
    clear,
    addCategory,
    updateCategoryLimit,
    updateCategoryName,
    deleteCategory,
  };
}
