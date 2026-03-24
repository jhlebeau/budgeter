"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { Category, useBudget } from "../budget-context";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export default function SavingsCategoriesPage() {
  const {
    savingCategories,
    incomes,
    addSavingCategory,
    updateSavingCategoryLimit,
    updateSavingCategoryName,
    deleteSavingCategory,
  } = useBudget();
  const [newCategory, setNewCategory] = useState("");
  const [newLimitType, setNewLimitType] = useState<"amount" | "percent">("amount");
  const [newLimit, setNewLimit] = useState("");
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingLimitType, setEditingLimitType] = useState<"amount" | "percent">("amount");
  const [editingLimit, setEditingLimit] = useState("");
  const [saveError, setSaveError] = useState("");

  const monthlyIncome = incomes.reduce(
    (total, income) => total + income.postTaxAmount,
    0,
  );

  const getCategoryBudgetAmount = (
    limitType: "amount" | "percent",
    limitValue: number,
  ) => (limitType === "amount" ? limitValue : (monthlyIncome * limitValue) / 100);

  const totalBudgetedAmount = savingCategories.reduce(
    (total, category) =>
      total + getCategoryBudgetAmount(category.limitType, category.limitValue),
    0,
  );

  const isOverBudget = totalBudgetedAmount > monthlyIncome;

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaveError("");
    if (await addSavingCategory(newCategory, newLimitType, Number(newLimit))) {
      setNewCategory("");
      setNewLimitType("amount");
      setNewLimit("");
      return;
    }
    setSaveError("Unable to add savings category. Please check server logs.");
  };

  const startLimitEdit = (category: Category) => {
    setEditingCategory(category.id);
    setEditingName(category.name);
    setEditingLimitType(category.limitType);
    setEditingLimit(String(category.limitValue));
  };

  const saveLimitEdit = async () => {
    if (!editingCategory) return;

    const didRename = await updateSavingCategoryName(editingCategory, editingName);
    if (!didRename) return;
    await updateSavingCategoryLimit(
      editingCategory,
      editingLimitType,
      Number(editingLimit),
    );
    setEditingCategory(null);
    setEditingName("");
    setEditingLimitType("amount");
    setEditingLimit("");
  };

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-10">
      <div className="mb-5 flex gap-4 text-sm">
        <Link href="/setup" className="text-zinc-600 hover:underline">
          Back to Setup
        </Link>
        <Link href="/home" className="text-zinc-600 hover:underline">
          Back to Home
        </Link>
      </div>
      <h1 className="mb-4 text-2xl font-semibold">Create Savings Categories</h1>

      <form onSubmit={onSubmit} className="space-y-3 rounded-lg border p-4">
        <input
          type="text"
          placeholder="Category name"
          value={newCategory}
          onChange={(event) => setNewCategory(event.target.value)}
          maxLength={60}
          className="w-full rounded border px-3 py-2"
          required
        />
        <select
          value={newLimitType}
          onChange={(event) =>
            setNewLimitType(event.target.value as "amount" | "percent")
          }
          className="w-full rounded border px-3 py-2"
        >
          <option value="amount">Dollar amount</option>
          <option value="percent">Percent of monthly income</option>
        </select>
        <div className="relative">
          {newLimitType === "amount" ? (
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
              $
            </span>
          ) : null}
          <input
            type="number"
            step="0.01"
            min="0.01"
            placeholder={
              newLimitType === "amount"
                ? "Monthly savings target"
                : "Percent of monthly income"
            }
            value={newLimit}
            onChange={(event) => setNewLimit(event.target.value)}
            className={`w-full rounded border py-2 pr-3 ${
              newLimitType === "amount" ? "pl-7" : "pl-3"
            }`}
            required
          />
        </div>
        <button
          type="submit"
          className="rounded bg-black px-4 py-2 text-white hover:bg-zinc-800"
        >
          Add Savings Category
        </button>
        <p className="text-sm text-zinc-600">
          Monthly income: {currencyFormatter.format(monthlyIncome)}
        </p>
        <p className="text-sm text-zinc-600">
          Total savings targets: {currencyFormatter.format(totalBudgetedAmount)}
        </p>
        {isOverBudget ? (
          <p className="text-sm font-medium text-red-600">
            Warning: Total savings targets exceed monthly income.
          </p>
        ) : null}
        {saveError ? (
          <p className="text-sm font-medium text-red-600">{saveError}</p>
        ) : null}
      </form>

      <section className="mt-6">
        <h2 className="mb-3 text-lg font-medium">Current Savings Categories</h2>
        <ul className="space-y-2">
          {savingCategories.map((category) => (
            <li key={category.id} className="rounded border px-3 py-2 text-sm">
              <p className="mb-2 font-medium">{category.name}</p>
              <p className="mb-2 text-zinc-600">
                Current limit:{" "}
                {category.limitType === "amount"
                  ? currencyFormatter.format(category.limitValue)
                  : `${category.limitValue.toFixed(2)}% (${currencyFormatter.format(
                      getCategoryBudgetAmount(category.limitType, category.limitValue),
                    )})`}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                {editingCategory === category.id ? (
                  <>
                    <input
                      type="text"
                      value={editingName}
                      onChange={(event) => setEditingName(event.target.value)}
                      maxLength={60}
                      className="rounded border px-3 py-1.5"
                    />
                    <select
                      value={editingLimitType}
                      onChange={(event) =>
                        setEditingLimitType(
                          event.target.value as "amount" | "percent",
                        )
                      }
                      className="rounded border px-3 py-1.5"
                    >
                      <option value="amount">Dollar amount</option>
                      <option value="percent">Percent of monthly income</option>
                    </select>
                    <div className="relative">
                      {editingLimitType === "amount" ? (
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
                          $
                        </span>
                      ) : null}
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={editingLimit}
                        onChange={(event) => setEditingLimit(event.target.value)}
                        className={`rounded border py-1.5 pr-3 ${
                          editingLimitType === "amount" ? "pl-7" : "pl-3"
                        }`}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={saveLimitEdit}
                      className="rounded border px-3 py-1.5 hover:bg-zinc-50"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCategory(null);
                        setEditingName("");
                        setEditingLimitType("amount");
                        setEditingLimit("");
                      }}
                      className="rounded border px-3 py-1.5 hover:bg-zinc-50"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => startLimitEdit(category)}
                    className="rounded border px-3 py-1.5 hover:bg-zinc-50"
                  >
                    Update Category
                  </button>
                )}
                <button
                  type="button"
                  onClick={async () => {
                    const shouldDelete = window.confirm(
                      `Delete savings category "${category.name}"?`,
                    );
                    if (!shouldDelete) return;

                    await deleteSavingCategory(category.id);
                    if (editingCategory === category.id) {
                      setEditingCategory(null);
                      setEditingName("");
                      setEditingLimitType("amount");
                      setEditingLimit("");
                    }
                  }}
                  className="rounded border px-3 py-1.5 text-red-600 hover:bg-zinc-50"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
          {savingCategories.length === 0 ? (
            <li className="text-sm text-zinc-500">No savings categories yet.</li>
          ) : null}
        </ul>
      </section>
    </main>
  );
}
