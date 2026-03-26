"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { Category, useBudget } from "../budget-context";
import { getCurrentMonthKey, isMonthInRange } from "@/lib/month-utils";
import { UNASSIGNED_CATEGORY_NAME } from "@/lib/spending-category-constants";
import { ENTRY_NAME_ALLOWED_CHARACTERS_MESSAGE } from "@/lib/input-validation";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const surfaceClass =
  "rounded-3xl border border-slate-200/80 bg-white/90 shadow-[0_18px_60px_-32px_rgba(15,23,42,0.35)] backdrop-blur";
const inputClass =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200";
const selectClass = inputClass;
const subtleButtonClass =
  "inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50";
const primaryButtonClass =
  "inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800";

const parseNonNegativeNumberInput = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
};

function SectionCard({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`${surfaceClass} p-6 sm:p-7`}>
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
          {eyebrow}
        </p>
        <h2 className="mt-2 text-xl font-semibold text-slate-950">{title}</h2>
        {description ? (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function FieldLabel({
  label,
  hint,
}: {
  label: string;
  hint?: string;
}) {
  return (
    <div className="mb-2 flex items-center justify-between gap-3">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      {hint ? <span className="text-xs text-slate-400">{hint}</span> : null}
    </div>
  );
}

function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className={`${surfaceClass} p-5`}>
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">{value}</p>
      <p className="mt-2 text-sm text-slate-500">{detail}</p>
    </div>
  );
}

export default function CategoriesPage() {
  const {
    categories,
    incomes,
    savingCategories,
    addCategory,
    updateCategoryLimit,
    updateCategoryName,
    deleteCategory,
  } = useBudget();
  const currentMonthKey = getCurrentMonthKey();
  const [newCategory, setNewCategory] = useState("");
  const [newLimitType, setNewLimitType] = useState<"amount" | "percent">("amount");
  const [newLimit, setNewLimit] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingLimitType, setEditingLimitType] = useState<"amount" | "percent">("amount");
  const [editingLimit, setEditingLimit] = useState("");

  const visibleCategories = useMemo(
    () => categories.filter((category) => category.name !== UNASSIGNED_CATEGORY_NAME),
    [categories],
  );

  const monthlyIncome = useMemo(
    () =>
      incomes.reduce(
        (total, income) =>
          isMonthInRange(currentMonthKey, income.startMonth, income.endMonth)
            ? total + income.postTaxAmount
            : total,
        0,
      ),
    [currentMonthKey, incomes],
  );

  const getCategoryBudgetAmount = (
    limitType: "amount" | "percent",
    limitValue: number,
  ) => (limitType === "amount" ? limitValue : (monthlyIncome * limitValue) / 100);

  const totalBudgetedAmount = visibleCategories.reduce(
    (total, category) =>
      total + getCategoryBudgetAmount(category.limitType, category.limitValue),
    0,
  );
  const totalSavingsAmount = savingCategories.reduce(
    (total, category) =>
      total + getCategoryBudgetAmount(category.limitType, category.limitValue),
    0,
  );
  const remainingAfterSpendingAndSaving =
    monthlyIncome - totalBudgetedAmount - totalSavingsAmount;
  const isOverBudget = totalBudgetedAmount > monthlyIncome;
  const parsedNewLimit = parseNonNegativeNumberInput(newLimit);
  const parsedEditingLimit = parseNonNegativeNumberInput(editingLimit);
  const canSubmitNewCategory =
    newCategory.trim().length > 0 && parsedNewLimit !== null;
  const canSaveEditedCategory =
    editingName.trim().length > 0 && parsedEditingLimit !== null;

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError("");
    if (parsedNewLimit === null) {
      setSubmitError("Enter a valid non-negative limit.");
      return;
    }

    const error = await addCategory(newCategory, newLimitType, parsedNewLimit);
    if (!error) {
      setNewCategory("");
      setNewLimitType("amount");
      setNewLimit("");
      return;
    }
    setSubmitError(error);
  };

  const startLimitEdit = (category: Category) => {
    setEditingCategory(category.id);
    setEditingName(category.name);
    setEditingLimitType(category.limitType);
    setEditingLimit(String(category.limitValue));
  };

  const saveLimitEdit = async () => {
    if (!editingCategory) return;
    if (parsedEditingLimit === null) return;

    const didRename = await updateCategoryName(editingCategory, editingName);
    if (!didRename) return;
    await updateCategoryLimit(editingCategory, editingLimitType, parsedEditingLimit);
    setEditingCategory(null);
    setEditingName("");
    setEditingLimitType("amount");
    setEditingLimit("");
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(148,163,184,0.16),_transparent_36%),linear-gradient(180deg,_#f8fafc_0%,_#eef2f7_100%)] px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className={`${surfaceClass} overflow-hidden p-6 sm:p-8`}>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
                <Link href="/setup" className="text-slate-500 transition hover:text-slate-900">
                  Setup
                </Link>
                <span className="text-slate-300">/</span>
                <Link href="/home" className="text-slate-500 transition hover:text-slate-900">
                  Home
                </Link>
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
                Spending Dashboard
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                Shape spending with cleaner category planning
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
                Create clear spending buckets, mix fixed limits with income-based
                percentages, and keep your monthly plan grounded in available cash flow.
              </p>
            </div>
            <div className="grid w-full gap-3 sm:grid-cols-2 lg:max-w-md">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <p className="text-sm text-slate-500">Monthly income</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">
                  {currencyFormatter.format(monthlyIncome)}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <p className="text-sm text-slate-500">Categories tracked</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">
                  {visibleCategories.length}
                </p>
              </div>
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <MetricCard
            label="Total spending budgeted"
            value={currencyFormatter.format(totalBudgetedAmount)}
            detail={`Across ${visibleCategories.length} spending categor${visibleCategories.length === 1 ? "y" : "ies"}`}
          />
          <MetricCard
            label="Left after spending and saving"
            value={currencyFormatter.format(Math.max(remainingAfterSpendingAndSaving, 0))}
            detail={
              remainingAfterSpendingAndSaving < 0
                ? `Over by ${currencyFormatter.format(Math.abs(remainingAfterSpendingAndSaving))}`
                : "Still unallocated after both plans"
            }
          />
          <MetricCard
            label="Planning status"
            value={isOverBudget ? "Over target" : "On track"}
            detail={
              isOverBudget
                ? "Current limits exceed this month’s income"
                : "Current limits fit within this month’s income"
            }
          />
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.02fr_0.98fr]">
          <SectionCard
            eyebrow="New Category"
            title="Add spending category"
            description="Set a fixed monthly amount or a percentage-based guardrail so your budget reflects how you actually want to allocate money."
          >
            <form onSubmit={onSubmit} className="space-y-6">
              <div className="grid gap-5 md:grid-cols-2">
                <div className="md:col-span-2">
                  <FieldLabel label="Category name" hint="Up to 60 characters" />
                  <input
                    type="text"
                    placeholder="Groceries, dining out, utilities"
                    value={newCategory}
                    onChange={(event) => setNewCategory(event.target.value)}
                    pattern="[A-Za-z0-9 _-]+"
                    title={ENTRY_NAME_ALLOWED_CHARACTERS_MESSAGE}
                    maxLength={60}
                    className={inputClass}
                    required
                  />
                </div>

                <div>
                  <FieldLabel label="Limit type" />
                  <select
                    value={newLimitType}
                    onChange={(event) =>
                      setNewLimitType(event.target.value as "amount" | "percent")
                    }
                    className={selectClass}
                  >
                    <option value="amount">Dollar amount</option>
                    <option value="percent">Percent of monthly income</option>
                  </select>
                </div>

                <div>
                  <FieldLabel
                    label={newLimitType === "amount" ? "Monthly limit" : "Income share"}
                    hint={newLimitType === "amount" ? "USD" : "Percent"}
                  />
                  <div className="relative">
                    {newLimitType === "amount" ? (
                      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                        $
                      </span>
                    ) : null}
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder={newLimitType === "amount" ? "0.00" : "0.00"}
                      value={newLimit}
                      onChange={(event) => setNewLimit(event.target.value)}
                      className={`${inputClass} ${newLimitType === "amount" ? "pl-8" : ""}`}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5">
                <div className="grid gap-3 md:grid-cols-4">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Monthly Income
                    </p>
                    <p className="mt-2 text-xl font-semibold text-slate-950">
                      {currencyFormatter.format(monthlyIncome)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Spending Budgeted So Far
                    </p>
                    <p className="mt-2 text-xl font-semibold text-slate-950">
                      {currencyFormatter.format(totalBudgetedAmount)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Budgeted Savings
                    </p>
                    <p className="mt-2 text-xl font-semibold text-slate-950">
                      {currencyFormatter.format(totalSavingsAmount)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Remaining
                    </p>
                    <p className="mt-2 text-xl font-semibold text-slate-950">
                      {currencyFormatter.format(remainingAfterSpendingAndSaving)}
                    </p>
                  </div>
                </div>

                {isOverBudget ? (
                  <p className="mt-4 text-sm font-medium text-red-600">
                    Current spending limits exceed monthly income.
                  </p>
                ) : (
                  <p className="mt-4 text-sm text-slate-500">
                    Keep fixed and percentage-based categories balanced so the plan remains
                    realistic.
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5">
                <div>
                  <p className="text-sm text-slate-500">
                    New categories appear immediately in your budget setup.
                  </p>
                  {submitError ? (
                    <p className="mt-2 text-sm font-medium text-red-600">{submitError}</p>
                  ) : null}
                </div>
                <button
                  type="submit"
                  className={primaryButtonClass}
                  disabled={!canSubmitNewCategory}
                >
                  Add category
                </button>
              </div>
            </form>
          </SectionCard>

          <SectionCard
            eyebrow="Category List"
            title="Current spending categories"
            description="Review your active allocation plan, switch between fixed amounts and percentages, and refine limits without leaving the dashboard."
          >
            <div className="mb-5">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <p className="text-sm text-slate-500">Current plan total</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">
                  {currencyFormatter.format(totalBudgetedAmount)}
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  {visibleCategories.length} tracked categories
                </p>
              </div>
            </div>

            <ul className="space-y-4">
              {visibleCategories.map((category) => {
                const budgetAmount = getCategoryBudgetAmount(
                  category.limitType,
                  category.limitValue,
                );

                return (
                  <li
                    key={category.id}
                    className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5"
                  >
                    {editingCategory === category.id ? (
                      <div className="space-y-5">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                              Editing category
                            </p>
                            <h3 className="mt-2 text-lg font-semibold text-slate-950">
                              {category.name}
                            </h3>
                          </div>
                          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-500">
                            {editingLimitType === "amount" ? "Fixed amount" : "Percent-based"}
                          </span>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="md:col-span-2">
                            <FieldLabel label="Category name" />
                            <input
                              type="text"
                              value={editingName}
                              onChange={(event) => setEditingName(event.target.value)}
                              pattern="[A-Za-z0-9 _-]+"
                              title={ENTRY_NAME_ALLOWED_CHARACTERS_MESSAGE}
                              maxLength={60}
                              className={inputClass}
                            />
                          </div>

                          <div>
                            <FieldLabel label="Limit type" />
                            <select
                              value={editingLimitType}
                              onChange={(event) =>
                                setEditingLimitType(
                                  event.target.value as "amount" | "percent",
                                )
                              }
                              className={selectClass}
                            >
                              <option value="amount">Dollar amount</option>
                              <option value="percent">Percent of monthly income</option>
                            </select>
                          </div>

                          <div>
                            <FieldLabel
                              label={editingLimitType === "amount" ? "Limit" : "Percent"}
                              hint={editingLimitType === "amount" ? "USD" : "Percent"}
                            />
                            <div className="relative">
                              {editingLimitType === "amount" ? (
                                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                                  $
                                </span>
                              ) : null}
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={editingLimit}
                                onChange={(event) => setEditingLimit(event.target.value)}
                                className={`${inputClass} ${
                                  editingLimitType === "amount" ? "pl-8" : ""
                                }`}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={saveLimitEdit}
                            className={primaryButtonClass}
                            disabled={!canSaveEditedCategory}
                          >
                            Save changes
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCategory(null);
                              setEditingName("");
                              setEditingLimitType("amount");
                              setEditingLimit("");
                            }}
                            className={subtleButtonClass}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-lg font-semibold text-slate-950">
                                {category.name}
                              </h3>
                              <span className="rounded-full bg-slate-200/70 px-3 py-1 text-xs font-medium text-slate-600">
                                {category.limitType === "amount" ? "Fixed amount" : "Percent-based"}
                              </span>
                            </div>
                            <p className="mt-2 text-sm text-slate-500">
                              {category.limitType === "amount"
                                ? "Direct monthly cap"
                                : "Scaled to current monthly income"}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-slate-500">Budgeted amount</p>
                            <p className="mt-1 text-2xl font-semibold text-slate-950">
                              {currencyFormatter.format(budgetAmount)}
                            </p>
                          </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                          <div className="rounded-2xl border border-slate-200 bg-white p-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                              Limit Type
                            </p>
                            <p className="mt-2 text-sm font-medium text-slate-900">
                              {category.limitType === "amount" ? "Dollar amount" : "Percent"}
                            </p>
                          </div>
                          <div className="rounded-2xl border border-slate-200 bg-white p-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                              Entered Limit
                            </p>
                            <p className="mt-2 text-sm font-medium text-slate-900">
                              {category.limitType === "amount"
                                ? currencyFormatter.format(category.limitValue)
                                : `${category.limitValue.toFixed(2)}%`}
                            </p>
                          </div>
                          <div className="rounded-2xl border border-slate-200 bg-white p-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                              Share of Income
                            </p>
                            <p className="mt-2 text-sm font-medium text-slate-900">
                              {monthlyIncome > 0
                                ? `${((budgetAmount / monthlyIncome) * 100).toFixed(2)}%`
                                : "0.00%"}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={() => startLimitEdit(category)}
                            className={subtleButtonClass}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              const shouldDelete = window.confirm(
                                `Delete category "${category.name}"? Existing transactions will be recategorized to Unassigned.`,
                              );
                              if (!shouldDelete) return;

                              await deleteCategory(category.id);
                              if (editingCategory === category.id) {
                                setEditingCategory(null);
                                setEditingName("");
                                setEditingLimitType("amount");
                                setEditingLimit("");
                              }
                            }}
                            className="inline-flex items-center justify-center rounded-2xl border border-red-200 bg-white px-4 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
              {visibleCategories.length === 0 ? (
                <li className="rounded-3xl border border-dashed border-slate-300 bg-slate-50/80 p-8 text-center text-sm text-slate-500">
                  No spending categories yet. Add a category to start shaping how your
                  monthly income gets allocated.
                </li>
              ) : null}
            </ul>
          </SectionCard>
        </div>
      </div>
    </main>
  );
}
