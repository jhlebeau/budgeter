"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { Category, useBudget } from "../budget-context";
import { getCurrentMonthKey, isMonthInRange } from "@/lib/month-utils";
import { ENTRY_NAME_ALLOWED_CHARACTERS_MESSAGE } from "@/lib/input-validation";
import { savingsTheme as theme } from "../ui/dashboard-theme";

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

export default function SavingsCategoriesPage() {
  const {
    categories,
    savingCategories,
    incomes,
    addSavingCategory,
    updateSavingCategoryLimit,
    updateSavingCategoryName,
    deleteSavingCategory,
  } = useBudget();
  const currentMonthKey = getCurrentMonthKey();
  const [newCategory, setNewCategory] = useState("");
  const [newLimitType, setNewLimitType] = useState<"amount" | "percent">("amount");
  const [newAmountPeriod, setNewAmountPeriod] = useState<"monthly" | "annual">(
    "monthly",
  );
  const [newLimit, setNewLimit] = useState("");
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingLimitType, setEditingLimitType] = useState<"amount" | "percent">("amount");
  const [editingAmountPeriod, setEditingAmountPeriod] = useState<
    "monthly" | "annual"
  >("monthly");
  const [editingLimit, setEditingLimit] = useState("");
  const [saveError, setSaveError] = useState("");

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

  const totalBudgetedAmount = savingCategories.reduce(
    (total, category) =>
      total + getCategoryBudgetAmount(category.limitType, category.limitValue),
    0,
  );
  const totalSpendingAmount = categories.reduce(
    (total, category) =>
      total + getCategoryBudgetAmount(category.limitType, category.limitValue),
    0,
  );
  const remainingAfterSpendingAndSaving =
    monthlyIncome - totalBudgetedAmount - totalSpendingAmount;
  const isOverBudget = totalBudgetedAmount > monthlyIncome;
  const parsedNewLimit = parseNonNegativeNumberInput(newLimit);
  const parsedEditingLimit = parseNonNegativeNumberInput(editingLimit);
  const canSubmitNewCategory =
    newCategory.trim().length > 0 && parsedNewLimit !== null;
  const canSaveEditedCategory =
    editingName.trim().length > 0 && parsedEditingLimit !== null;

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaveError("");
    if (parsedNewLimit === null) {
      setSaveError("Enter a valid non-negative target.");
      return;
    }
    const normalizedLimit =
      newLimitType === "amount" && newAmountPeriod === "annual"
        ? parsedNewLimit / 12
        : parsedNewLimit;

    const error = await addSavingCategory(newCategory, newLimitType, normalizedLimit);
    if (!error) {
      setNewCategory("");
      setNewLimitType("amount");
      setNewAmountPeriod("monthly");
      setNewLimit("");
      return;
    }
    setSaveError(error);
  };

  const startLimitEdit = (category: Category) => {
    setEditingCategory(category.id);
    setEditingName(category.name);
    setEditingLimitType(category.limitType);
    setEditingAmountPeriod("monthly");
    setEditingLimit(String(category.limitValue));
  };

  const saveLimitEdit = async () => {
    if (!editingCategory) return;
    if (parsedEditingLimit === null) return;
    const normalizedLimit =
      editingLimitType === "amount" && editingAmountPeriod === "annual"
        ? parsedEditingLimit / 12
        : parsedEditingLimit;

    const didRename = await updateSavingCategoryName(editingCategory, editingName);
    if (!didRename) return;
    await updateSavingCategoryLimit(
      editingCategory,
      editingLimitType,
      normalizedLimit,
    );
    setEditingCategory(null);
    setEditingName("");
    setEditingLimitType("amount");
    setEditingAmountPeriod("monthly");
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
                Savings Dashboard
              </p>
              <h1 className={`mt-3 text-3xl font-semibold tracking-tight sm:text-4xl ${theme.heading}`}>
                Design savings goals with a calmer monthly view
              </h1>
              <p className={`mt-4 max-w-2xl text-sm leading-6 sm:text-base ${theme.body}`}>
                Set savings targets as fixed amounts or income-based shares, track how much
                of this month’s cash flow is already committed, and keep your goals realistic.
              </p>
            </div>
            <div className="grid w-full gap-3 sm:grid-cols-2 lg:max-w-md">
              <div className="rounded-2xl border border-emerald-400/25 bg-slate-900/70 p-4">
                <p className="text-sm text-slate-300">Monthly income</p>
                <p className="mt-2 text-2xl font-semibold text-slate-50">
                  {currencyFormatter.format(monthlyIncome)}
                </p>
              </div>
              <div className="rounded-2xl border border-emerald-400/25 bg-slate-900/70 p-4">
                <p className="text-sm text-slate-300">Savings goals</p>
                <p className="mt-2 text-2xl font-semibold text-slate-50">
                  {savingCategories.length}
                </p>
              </div>
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <MetricCard
            label="Total savings planned"
            value={currencyFormatter.format(totalBudgetedAmount)}
            detail={`Across ${savingCategories.length} savings categor${savingCategories.length === 1 ? "y" : "ies"}`}
          />
          <MetricCard
            label="Left after spending and saving"
            value={currencyFormatter.format(Math.max(remainingAfterSpendingAndSaving, 0))}
            detail={
              remainingAfterSpendingAndSaving < 0
                ? `Over target by ${currencyFormatter.format(Math.abs(remainingAfterSpendingAndSaving))}`
                : "Unallocated after both plans"
            }
          />
          <MetricCard
            label="Savings plan status"
            value={isOverBudget ? "Over target" : "Balanced"}
            detail={
              isOverBudget
                ? "Goals exceed current monthly income"
                : "Goals fit within current monthly income"
            }
          />
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.02fr_0.98fr]">
          <SectionCard
            eyebrow="New Goal"
            title="Add savings category"
            description="Capture monthly or annual savings targets, convert them into a clear monthly plan, and keep savings aligned with the income you actually have."
          >
            <form onSubmit={onSubmit} className="space-y-6">
              <div className="grid gap-5 md:grid-cols-2">
                <div className="md:col-span-2">
                  <FieldLabel label="Category name" hint="Up to 60 characters" />
                  <input
                    type="text"
                    placeholder="Emergency fund, travel, taxes"
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
                  <FieldLabel label="Target type" />
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

                {newLimitType === "amount" ? (
                  <div>
                    <FieldLabel label="Time basis" />
                    <select
                      value={newAmountPeriod}
                      onChange={(event) =>
                        setNewAmountPeriod(event.target.value as "monthly" | "annual")
                      }
                      className={selectClass}
                    >
                      <option value="monthly">Monthly amount</option>
                      <option value="annual">Annual amount</option>
                    </select>
                  </div>
                ) : null}

                <div className={newLimitType === "percent" ? "md:col-span-2" : ""}>
                  <FieldLabel
                    label={newLimitType === "amount" ? "Savings target" : "Income share"}
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
                      placeholder="0.00"
                      value={newLimit}
                      onChange={(event) => setNewLimit(event.target.value)}
                      className={`${inputClass} ${newLimitType === "amount" ? "pl-8" : ""}`}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-emerald-400/25 bg-slate-900/70 p-5">
                <div className="grid gap-3 md:grid-cols-4">
                  <div className="rounded-2xl border border-emerald-400/20 bg-slate-950/85 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200/70">
                      Monthly Income
                    </p>
                    <p className="mt-2 text-xl font-semibold text-slate-50">
                      {currencyFormatter.format(monthlyIncome)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-emerald-400/20 bg-slate-950/85 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200/70">
                      Planned Savings
                    </p>
                    <p className="mt-2 text-xl font-semibold text-slate-50">
                      {currencyFormatter.format(totalBudgetedAmount)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-emerald-400/20 bg-slate-950/85 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200/70">
                      Budgeted Spending
                    </p>
                    <p className="mt-2 text-xl font-semibold text-slate-50">
                      {currencyFormatter.format(totalSpendingAmount)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-emerald-400/20 bg-slate-950/85 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200/70">
                      Remaining
                    </p>
                    <p className="mt-2 text-xl font-semibold text-slate-50">
                      {currencyFormatter.format(remainingAfterSpendingAndSaving)}
                    </p>
                  </div>
                </div>

                {newLimitType === "amount" && newAmountPeriod === "annual" ? (
                  <p className="mt-4 text-sm text-slate-300">
                    Annual savings targets are converted to monthly values after saving.
                  </p>
                ) : null}

                {isOverBudget ? (
                  <p className="mt-4 text-sm font-medium text-red-600">
                    Current savings targets exceed monthly income.
                  </p>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5">
                <div>
                  <p className="text-sm text-slate-300">
                    New savings goals update the monthly plan immediately.
                  </p>
                  {saveError ? (
                    <p className="mt-2 text-sm font-medium text-red-600">{saveError}</p>
                  ) : null}
                </div>
                <button
                  type="submit"
                  className={primaryButtonClass}
                  disabled={!canSubmitNewCategory}
                >
                  Add savings goal
                </button>
              </div>
            </form>
          </SectionCard>

          <SectionCard
            eyebrow="Goal List"
            title="Current savings categories"
            description="Review your active savings mix, adjust monthly and annual targets, and keep every goal visible in one clean planning view."
            className="flex flex-col overflow-hidden xl:max-h-[calc(170vh-23.8rem)]"
            contentClassName="flex min-h-0 flex-1 flex-col"
          >
            <div className="mb-5">
              <div className="rounded-2xl border border-emerald-400/25 bg-slate-900/70 p-4">
                <p className="text-sm text-slate-300">Total monthly target</p>
                <p className="mt-2 text-2xl font-semibold text-slate-50">
                  {currencyFormatter.format(totalBudgetedAmount)}
                </p>
                <p className="mt-2 text-sm text-slate-300">
                  {savingCategories.length} savings categories tracked
                </p>
              </div>
            </div>

            <ul className="min-h-0 flex-1 space-y-4 overflow-y-auto pb-10 xl:pr-2">
              {savingCategories.map((category) => {
                const monthlyTarget = getCategoryBudgetAmount(
                  category.limitType,
                  category.limitValue,
                );

                return (
                  <li
                    key={category.id}
                    className="rounded-3xl border border-emerald-400/25 bg-slate-900/72 p-5"
                  >
                    {editingCategory === category.id ? (
                      <div className="space-y-5">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200/70">
                              Editing savings goal
                            </p>
                            <h3 className="mt-2 text-lg font-semibold text-slate-50">
                              {category.name}
                            </h3>
                          </div>
                          <span className="rounded-full border border-emerald-400/25 bg-slate-950/80 px-3 py-1 text-xs font-medium text-emerald-200">
                            {editingLimitType === "amount" ? "Fixed target" : "Percent-based"}
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
                            <FieldLabel label="Target type" />
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

                          {editingLimitType === "amount" ? (
                            <div>
                              <FieldLabel label="Time basis" />
                              <select
                                value={editingAmountPeriod}
                                onChange={(event) =>
                                  setEditingAmountPeriod(
                                    event.target.value as "monthly" | "annual",
                                  )
                                }
                                className={selectClass}
                              >
                                <option value="monthly">Monthly</option>
                                <option value="annual">Annual</option>
                              </select>
                            </div>
                          ) : null}

                          <div className={editingLimitType === "percent" ? "md:col-span-2" : ""}>
                            <FieldLabel
                              label={editingLimitType === "amount" ? "Target" : "Percent"}
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

                        {editingLimitType === "amount" &&
                        editingAmountPeriod === "annual" ? (
                          <p className="text-sm text-slate-300">
                            Annual targets are converted to monthly values when saved.
                          </p>
                        ) : null}

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
                              setEditingAmountPeriod("monthly");
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
                              <h3 className="text-lg font-semibold text-slate-50">
                                {category.name}
                              </h3>
                              <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-300">
                                {category.limitType === "amount" ? "Fixed target" : "Percent-based"}
                              </span>
                            </div>
                            <p className="mt-2 text-sm text-slate-300">
                              {category.limitType === "amount"
                                ? "Stored as a monthly savings target"
                                : "Scales with current monthly income"}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-slate-300">Monthly target</p>
                            <p className="mt-1 text-2xl font-semibold text-slate-50">
                              {currencyFormatter.format(monthlyTarget)}
                            </p>
                          </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                          <div className="rounded-2xl border border-emerald-400/20 bg-slate-950/85 p-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200/70">
                              Target Type
                            </p>
                            <p className="mt-2 text-sm font-medium text-slate-100">
                              {category.limitType === "amount" ? "Dollar amount" : "Percent"}
                            </p>
                          </div>
                          <div className="rounded-2xl border border-emerald-400/20 bg-slate-950/85 p-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200/70">
                              Entered Target
                            </p>
                            <p className="mt-2 text-sm font-medium text-slate-100">
                              {category.limitType === "amount"
                                ? `${currencyFormatter.format(category.limitValue)} / month`
                                : `${category.limitValue.toFixed(2)}%`}
                            </p>
                          </div>
                          <div className="rounded-2xl border border-emerald-400/20 bg-slate-950/85 p-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200/70">
                              Share of Income
                            </p>
                            <p className="mt-2 text-sm font-medium text-slate-100">
                              {monthlyIncome > 0
                                ? `${((monthlyTarget / monthlyIncome) * 100).toFixed(2)}%`
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
              {savingCategories.length === 0 ? (
                <li className="rounded-3xl border border-dashed border-emerald-400/25 bg-slate-900/60 p-8 text-center text-sm text-slate-300">
                  No savings categories yet. Add a goal to start turning monthly income
                  into a more deliberate savings plan.
                </li>
              ) : null}
            </ul>
          </SectionCard>
        </div>
      </div>
    </main>
  );
}
