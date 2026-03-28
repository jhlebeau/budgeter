"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { Category, useBudget } from "../budget-context";
import { getCurrentMonthKey, isMonthInRange } from "@/lib/month-utils";
import { UNASSIGNED_CATEGORY_NAME } from "@/lib/spending-category-constants";
import { ENTRY_NAME_ALLOWED_CHARACTERS_MESSAGE } from "@/lib/input-validation";
import { categoriesTheme as theme } from "../ui/dashboard-theme";
import { useToast } from "../ui/toast";
import { ConfirmModal } from "../ui/confirm-modal";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const surfaceClass = theme.surface;
const inputClass = theme.input;
const selectClass = inputClass;
const subtleButtonClass = theme.subtleButton;
const primaryButtonClass = theme.primaryButton;

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
  className,
  contentClassName,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <section className={`${surfaceClass} p-6 sm:p-7 ${className ?? ""}`}>
      <div className="mb-6">
        <p className={`text-xs font-semibold uppercase tracking-[0.24em] ${theme.eyebrow}`}>
          {eyebrow}
        </p>
        <h2 className={`mt-2 text-xl font-semibold ${theme.heading}`}>{title}</h2>
        {description ? (
          <p className={`mt-2 max-w-2xl text-sm leading-6 ${theme.body}`}>{description}</p>
        ) : null}
      </div>
      <div className={contentClassName}>{children}</div>
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
      <label className={`text-sm font-medium ${theme.label}`}>{label}</label>
      {hint ? <span className={`text-xs ${theme.hint}`}>{hint}</span> : null}
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
      <p className={`text-sm font-medium ${theme.metricLabel}`}>{label}</p>
      <p className={`mt-3 text-2xl font-semibold tracking-tight ${theme.heading}`}>{value}</p>
      <p className={`mt-2 text-sm ${theme.body}`}>{detail}</p>
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
  const { addToast } = useToast();
  const [submitError, setSubmitError] = useState("");
  const [pendingDelete, setPendingDelete] = useState<Category | null>(null);
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
    if (!didRename) {
      addToast("Failed to save category name. Please try again.");
      return;
    }
    const didUpdate = await updateCategoryLimit(editingCategory, editingLimitType, parsedEditingLimit);
    if (!didUpdate) {
      addToast("Failed to save category limit. Please try again.");
      return;
    }
    setEditingCategory(null);
    setEditingName("");
    setEditingLimitType("amount");
    setEditingLimit("");
  };

  return (
    <main className={theme.page}>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className={`${surfaceClass} overflow-hidden p-6 sm:p-8`}>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
                <Link href="/setup" className={theme.breadcrumb}>
                  Setup
                </Link>
                <span className={theme.hint}>/</span>
                <Link href="/home" className={theme.breadcrumb}>
                  Home
                </Link>
              </div>
              <p className={`text-xs font-semibold uppercase tracking-[0.28em] ${theme.eyebrow}`}>
                Spending Dashboard
              </p>
              <h1 className={`mt-3 text-3xl font-semibold tracking-tight sm:text-4xl ${theme.heading}`}>
                Shape spending with cleaner category planning
              </h1>
              <p className={`mt-4 max-w-2xl text-sm leading-6 sm:text-base ${theme.body}`}>
                Create clear spending buckets, mix fixed limits with income-based
                percentages, and keep your monthly plan grounded in available cash flow.
              </p>
            </div>
            <div className="grid w-full gap-3 sm:grid-cols-2 lg:max-w-md">
              <div className={`${theme.card} p-4`}>
                <p className={`text-sm ${theme.metricLabel}`}>Monthly income</p>
                <p className={`mt-2 text-2xl font-semibold ${theme.heading}`}>
                  {currencyFormatter.format(monthlyIncome)}
                </p>
              </div>
              <div className={`${theme.card} p-4`}>
                <p className={`text-sm ${theme.metricLabel}`}>Categories tracked</p>
                <p className={`mt-2 text-2xl font-semibold ${theme.heading}`}>
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

              <div className={`${theme.card} p-5`}>
                <div className="grid gap-3 md:grid-cols-4">
                  <div className={`${theme.surface} rounded-2xl p-4 shadow-none`}>
                    <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${theme.eyebrow}`}>
                      Monthly Income
                    </p>
                    <p className={`mt-2 text-xl font-semibold ${theme.heading}`}>
                      {currencyFormatter.format(monthlyIncome)}
                    </p>
                  </div>
                  <div className={`${theme.surface} rounded-2xl p-4 shadow-none`}>
                    <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${theme.eyebrow}`}>
                      Spending Budgeted So Far
                    </p>
                    <p className={`mt-2 text-xl font-semibold ${theme.heading}`}>
                      {currencyFormatter.format(totalBudgetedAmount)}
                    </p>
                  </div>
                  <div className={`${theme.surface} rounded-2xl p-4 shadow-none`}>
                    <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${theme.eyebrow}`}>
                      Budgeted Savings
                    </p>
                    <p className={`mt-2 text-xl font-semibold ${theme.heading}`}>
                      {currencyFormatter.format(totalSavingsAmount)}
                    </p>
                  </div>
                  <div className={`${theme.surface} rounded-2xl p-4 shadow-none`}>
                    <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${theme.eyebrow}`}>
                      Remaining
                    </p>
                    <p className={`mt-2 text-xl font-semibold ${theme.heading}`}>
                      {currencyFormatter.format(remainingAfterSpendingAndSaving)}
                    </p>
                  </div>
                </div>

                {isOverBudget ? (
                  <p className="mt-4 text-sm font-medium text-red-600">
                    Current spending limits exceed monthly income.
                  </p>
                ) : (
                  <p className={`mt-4 text-sm ${theme.body}`}>
                    Keep fixed and percentage-based categories balanced so the plan remains
                    realistic.
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5">
                <div>
                  <p className={`text-sm ${theme.body}`}>
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
            className="flex flex-col overflow-hidden xl:max-h-[calc(170vh-23.8rem)]"
            contentClassName="flex min-h-0 flex-1 flex-col"
          >
            <div className="mb-5">
              <div className={`${theme.card} p-4`}>
                <p className={`text-sm ${theme.metricLabel}`}>Current plan total</p>
                <p className={`mt-2 text-2xl font-semibold ${theme.heading}`}>
                  {currencyFormatter.format(totalBudgetedAmount)}
                </p>
                <p className={`mt-2 text-sm ${theme.body}`}>
                  {visibleCategories.length} tracked categories
                </p>
              </div>
            </div>

            <ul className="min-h-0 flex-1 space-y-4 overflow-y-auto pb-10 xl:pr-2">
              {visibleCategories.map((category) => {
                const budgetAmount = getCategoryBudgetAmount(
                  category.limitType,
                  category.limitValue,
                );

                return (
                  <li
                    key={category.id}
                    className={`${theme.card} rounded-3xl p-5`}
                  >
                    {editingCategory === category.id ? (
                      <div className="space-y-5">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className={`text-xs font-semibold uppercase tracking-[0.2em] ${theme.eyebrow}`}>
                              Editing category
                            </p>
                            <h3 className={`mt-2 text-lg font-semibold ${theme.heading}`}>
                              {category.name}
                            </h3>
                          </div>
                          <span className={theme.pill}>
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
                                <span className={`pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm ${theme.hint}`}>
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
                              <h3 className={`text-lg font-semibold ${theme.heading}`}>
                                {category.name}
                              </h3>
                              <span className={theme.pill}>
                                {category.limitType === "amount" ? "Fixed amount" : "Percent-based"}
                              </span>
                            </div>
                            <p className={`mt-2 text-sm ${theme.body}`}>
                              {category.limitType === "amount"
                                ? "Direct monthly cap"
                                : "Scaled to current monthly income"}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className={`text-sm ${theme.metricLabel}`}>Budgeted amount</p>
                            <p className={`mt-1 text-2xl font-semibold ${theme.heading}`}>
                              {currencyFormatter.format(budgetAmount)}
                            </p>
                          </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                          <div className={`${theme.surface} rounded-2xl p-4 shadow-none`}>
                            <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${theme.eyebrow}`}>
                              Limit Type
                            </p>
                            <p className={`mt-2 text-sm font-medium ${theme.heading}`}>
                              {category.limitType === "amount" ? "Dollar amount" : "Percent"}
                            </p>
                          </div>
                          <div className={`${theme.surface} rounded-2xl p-4 shadow-none`}>
                            <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${theme.eyebrow}`}>
                              Entered Limit
                            </p>
                            <p className={`mt-2 text-sm font-medium ${theme.heading}`}>
                              {category.limitType === "amount"
                                ? currencyFormatter.format(category.limitValue)
                                : `${category.limitValue.toFixed(2)}%`}
                            </p>
                          </div>
                          <div className={`${theme.surface} rounded-2xl p-4 shadow-none`}>
                            <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${theme.eyebrow}`}>
                              Share of Income
                            </p>
                            <p className={`mt-2 text-sm font-medium ${theme.heading}`}>
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
                            onClick={() => setPendingDelete(category)}
                            className="inline-flex items-center justify-center rounded-2xl border border-red-400/35 bg-slate-950/85 px-4 py-2.5 text-sm font-medium text-red-200 transition hover:bg-red-950/60"
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
                <li className={theme.emptyState}>
                  No spending categories yet. Add a category to start shaping how your
                  monthly income gets allocated.
                </li>
              ) : null}
            </ul>
          </SectionCard>
        </div>
      </div>
      <ConfirmModal
        isOpen={pendingDelete !== null}
        message={`Delete category "${pendingDelete?.name}"? Existing transactions will be recategorized to Unassigned.`}
        onConfirm={async () => {
          const ok = await deleteCategory(pendingDelete!.id);
          if (!ok) addToast("Failed to delete category. Please try again.");
          else if (editingCategory === pendingDelete!.id) {
            setEditingCategory(null);
            setEditingName("");
            setEditingLimitType("amount");
            setEditingLimit("");
          }
          setPendingDelete(null);
        }}
        onCancel={() => setPendingDelete(null)}
      />
    </main>
  );
}
