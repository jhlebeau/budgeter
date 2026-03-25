"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { Category, useBudget } from "../budget-context";
import { getCurrentMonthKey, isMonthInRange } from "@/lib/month-utils";
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

export default function SavingsCategoriesPage() {
  const {
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
  const remainingAfterSavings = monthlyIncome - totalBudgetedAmount;
  const isOverBudget = totalBudgetedAmount > monthlyIncome;
  const percentBasedCount = savingCategories.filter(
    (category) => category.limitType === "percent",
  ).length;

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaveError("");
    const enteredLimit = Number(newLimit);
    const normalizedLimit =
      newLimitType === "amount" && newAmountPeriod === "annual"
        ? enteredLimit / 12
        : enteredLimit;

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
    const enteredLimit = Number(editingLimit);
    const normalizedLimit =
      editingLimitType === "amount" && editingAmountPeriod === "annual"
        ? enteredLimit / 12
        : enteredLimit;

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
                Savings Dashboard
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                Design savings goals with a calmer monthly view
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
                Set savings targets as fixed amounts or income-based shares, track how much
                of this month’s cash flow is already committed, and keep your goals realistic.
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
                <p className="text-sm text-slate-500">Savings goals</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">
                  {savingCategories.length}
                </p>
              </div>
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Total savings planned"
            value={currencyFormatter.format(totalBudgetedAmount)}
            detail={`Across ${savingCategories.length} savings categor${savingCategories.length === 1 ? "y" : "ies"}`}
          />
          <MetricCard
            label="Income left after goals"
            value={currencyFormatter.format(Math.max(remainingAfterSavings, 0))}
            detail={
              isOverBudget
                ? `Over target by ${currencyFormatter.format(Math.abs(remainingAfterSavings))}`
                : "Unallocated after savings goals"
            }
          />
          <MetricCard
            label="Percent-based goals"
            value={String(percentBasedCount)}
            detail={`${savingCategories.length - percentBasedCount} use fixed dollar targets`}
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

              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5">
                <div className="grid gap-3 md:grid-cols-3">
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
                      Planned Savings
                    </p>
                    <p className="mt-2 text-xl font-semibold text-slate-950">
                      {currencyFormatter.format(totalBudgetedAmount)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Remaining
                    </p>
                    <p className="mt-2 text-xl font-semibold text-slate-950">
                      {currencyFormatter.format(remainingAfterSavings)}
                    </p>
                  </div>
                </div>

                {newLimitType === "amount" && newAmountPeriod === "annual" ? (
                  <p className="mt-4 text-sm text-slate-500">
                    Annual savings targets are converted to monthly values after saving.
                  </p>
                ) : null}

                {isOverBudget ? (
                  <p className="mt-4 text-sm font-medium text-red-600">
                    Current savings targets exceed monthly income.
                  </p>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5">
                <div>
                  <p className="text-sm text-slate-500">
                    New savings goals update the monthly plan immediately.
                  </p>
                  {saveError ? (
                    <p className="mt-2 text-sm font-medium text-red-600">{saveError}</p>
                  ) : null}
                </div>
                <button type="submit" className={primaryButtonClass}>
                  Add savings goal
                </button>
              </div>
            </form>
          </SectionCard>

          <SectionCard
            eyebrow="Goal List"
            title="Current savings categories"
            description="Review your active savings mix, adjust monthly and annual targets, and keep every goal visible in one clean planning view."
          >
            <div className="mb-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <p className="text-sm text-slate-500">Total monthly target</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">
                  {currencyFormatter.format(totalBudgetedAmount)}
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  {savingCategories.length} savings categories tracked
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <p className="text-sm text-slate-500">Remaining after savings</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">
                  {currencyFormatter.format(remainingAfterSavings)}
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  Based on income for {currentMonthKey}
                </p>
              </div>
            </div>

            <ul className="space-y-4">
              {savingCategories.map((category) => {
                const monthlyTarget = getCategoryBudgetAmount(
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
                              Editing savings goal
                            </p>
                            <h3 className="mt-2 text-lg font-semibold text-slate-950">
                              {category.name}
                            </h3>
                          </div>
                          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-500">
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
                          <p className="text-sm text-slate-500">
                            Annual targets are converted to monthly values when saved.
                          </p>
                        ) : null}

                        <div className="flex flex-wrap gap-3">
                          <button type="button" onClick={saveLimitEdit} className={primaryButtonClass}>
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
                              <h3 className="text-lg font-semibold text-slate-950">
                                {category.name}
                              </h3>
                              <span className="rounded-full bg-slate-200/70 px-3 py-1 text-xs font-medium text-slate-600">
                                {category.limitType === "amount" ? "Fixed target" : "Percent-based"}
                              </span>
                            </div>
                            <p className="mt-2 text-sm text-slate-500">
                              {category.limitType === "amount"
                                ? "Stored as a monthly savings target"
                                : "Scales with current monthly income"}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-slate-500">Monthly target</p>
                            <p className="mt-1 text-2xl font-semibold text-slate-950">
                              {currencyFormatter.format(monthlyTarget)}
                            </p>
                          </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                          <div className="rounded-2xl border border-slate-200 bg-white p-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                              Target Type
                            </p>
                            <p className="mt-2 text-sm font-medium text-slate-900">
                              {category.limitType === "amount" ? "Dollar amount" : "Percent"}
                            </p>
                          </div>
                          <div className="rounded-2xl border border-slate-200 bg-white p-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                              Entered Target
                            </p>
                            <p className="mt-2 text-sm font-medium text-slate-900">
                              {category.limitType === "amount"
                                ? `${currencyFormatter.format(category.limitValue)} / month`
                                : `${category.limitValue.toFixed(2)}%`}
                            </p>
                          </div>
                          <div className="rounded-2xl border border-slate-200 bg-white p-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                              Share of Income
                            </p>
                            <p className="mt-2 text-sm font-medium text-slate-900">
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
              {savingCategories.length === 0 ? (
                <li className="rounded-3xl border border-dashed border-slate-300 bg-slate-50/80 p-8 text-center text-sm text-slate-500">
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
