"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useBudget } from "../budget-context";
import { UNASSIGNED_CATEGORY_NAME } from "@/lib/spending-category-constants";
import { getCurrentMonthKey } from "@/lib/month-utils";

type FormData = {
  amount: string;
  categoryId: string;
  date: string;
  note: string;
  isRecurring: boolean;
  recurrenceFrequency: "daily" | "weekly" | "monthly";
};

const emptyForm: FormData = {
  amount: "",
  categoryId: "",
  date: "",
  note: "",
  isRecurring: false,
  recurrenceFrequency: "monthly",
};

const getDefaultDate = () => new Date().toISOString().slice(0, 10);

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const surfaceClass =
  "rounded-3xl border border-slate-200/80 bg-white/90 shadow-[0_18px_60px_-32px_rgba(15,23,42,0.35)] backdrop-blur";
const inputClass =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200";
const selectClass = inputClass;
const subtleButtonClass =
  "inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50";
const primaryButtonClass =
  "inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400";

const parseNonNegativeNumberInput = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
};

const isValidDateInput = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

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

export default function TransactionsPage() {
  const {
    categories,
    transactions,
    addTransaction,
    updateTransaction,
    deleteTransaction,
  } = useBudget();
  const [form, setForm] = useState<FormData>(() => ({
    ...emptyForm,
    date: getDefaultDate(),
  }));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormData>(emptyForm);
  const [submitError, setSubmitError] = useState("");
  const [editError, setEditError] = useState("");
  const [deleteScopeForId, setDeleteScopeForId] = useState<string | null>(null);
  const [editScopeForId, setEditScopeForId] = useState<string | null>(null);
  const currentMonthKey = getCurrentMonthKey();
  const parsedFormAmount = parseNonNegativeNumberInput(form.amount);
  const parsedEditAmount = parseNonNegativeNumberInput(editForm.amount);
  const canSubmitTransaction =
    parsedFormAmount !== null && form.categoryId !== "" && isValidDateInput(form.date);
  const canSaveTransactionEdit =
    parsedEditAmount !== null && editForm.categoryId !== "" && isValidDateInput(editForm.date);

  const categoriesForSelect = useMemo(() => {
    const unassigned = categories.find(
      (category) => category.name === UNASSIGNED_CATEGORY_NAME,
    );
    const others = categories.filter(
      (category) => category.name !== UNASSIGNED_CATEGORY_NAME,
    );
    return unassigned ? [...others, unassigned] : others;
  }, [categories]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError("");
    if (!canSubmitTransaction || parsedFormAmount === null) {
      setSubmitError("Enter a valid amount, date, and category.");
      return;
    }

    const error = await addTransaction({
      amount: parsedFormAmount,
      categoryId: form.categoryId,
      date: form.date,
      note: form.note.trim(),
      isRecurring: form.isRecurring,
      recurrenceFrequency: form.recurrenceFrequency,
    });
    if (error) {
      setSubmitError(error);
      return;
    }

    setForm({
      ...emptyForm,
      date: getDefaultDate(),
    });
  };

  const startEditing = (id: string) => {
    const transaction = transactions.find((item) => item.id === id);
    if (!transaction) return;

    setEditingId(id);
    setEditScopeForId(null);
    setEditForm({
      amount: String(transaction.amount),
      categoryId: transaction.categoryId,
      date: transaction.date,
      note: transaction.note,
      isRecurring: transaction.recurringSeriesId !== null,
      recurrenceFrequency: transaction.recurrenceFrequency ?? "monthly",
    });
  };

  const saveEdit = async (scope: "this" | "future" | "all" = "this") => {
    if (editingId === null) return;
    setEditError("");
    if (!canSaveTransactionEdit || parsedEditAmount === null) {
      setEditError("Enter a valid amount, date, and category before saving.");
      return;
    }

    await updateTransaction(
      editingId,
      {
        amount: parsedEditAmount,
        categoryId: editForm.categoryId,
        date: editForm.date,
        note: editForm.note.trim(),
        recurrenceFrequency: editForm.recurrenceFrequency,
      },
      scope,
    );

    setEditingId(null);
    setEditScopeForId(null);
    setEditForm(emptyForm);
    setEditError("");
  };

  const monthTransactions = useMemo(
    () => transactions.filter((transaction) => transaction.date.slice(0, 7) === currentMonthKey),
    [currentMonthKey, transactions],
  );
  const monthSpend = monthTransactions.reduce(
    (total, transaction) => total + transaction.amount,
    0,
  );
  const activeRecurringSeriesCount = useMemo(
    () =>
      new Set(
        transactions
          .filter(
            (transaction) =>
              transaction.recurringSeriesId !== null &&
              transaction.recurringSeriesStatus === "active",
          )
          .map((transaction) => transaction.recurringSeriesId),
      ).size,
    [transactions],
  );

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(148,163,184,0.16),_transparent_36%),linear-gradient(180deg,_#f8fafc_0%,_#eef2f7_100%)] px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className={`${surfaceClass} overflow-hidden p-6 sm:p-8`}>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
                <Link href="/home" className="text-slate-500 transition hover:text-slate-900">
                  Home
                </Link>
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
                Transaction Dashboard
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                Record transactions with a clearer daily workflow
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
                Log one-off and recurring spending, keep categories organized, and
                maintain a cleaner history of what moved this month.
              </p>
            </div>
            <div className="grid w-full gap-3 sm:grid-cols-2 lg:max-w-md">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <p className="text-sm text-slate-500">This month</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">
                  {currencyFormatter.format(monthSpend)}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <p className="text-sm text-slate-500">Transactions tracked</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">
                  {transactions.length}
                </p>
              </div>
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-2">
          <MetricCard
            label="Monthly spend logged"
            value={currencyFormatter.format(monthSpend)}
            detail={`Across ${monthTransactions.length} transaction${monthTransactions.length === 1 ? "" : "s"} in ${currentMonthKey}`}
          />
          <MetricCard
            label="Recurring transactions"
            value={String(activeRecurringSeriesCount)}
            detail="Counts unique active recurring series only"
          />
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.02fr_0.98fr]">
          <SectionCard
            eyebrow="New Transaction"
            title="Record transaction"
            description="Capture amount, timing, category, and recurrence in one clean flow so your spending history stays easy to manage."
          >
            <form onSubmit={onSubmit} className="space-y-6">
              <div className="grid gap-5 md:grid-cols-2">
                <div className="md:col-span-2">
                  <FieldLabel label="Category" />
                  <select
                    value={form.categoryId}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, categoryId: event.target.value }))
                    }
                    className={selectClass}
                    required
                  >
                    <option value="">Select a category</option>
                    {categoriesForSelect.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <FieldLabel label="Amount" hint="USD" />
                  <div className="relative">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                      $
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={form.amount}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, amount: event.target.value }))
                      }
                      className={`${inputClass} pl-8`}
                      required
                    />
                  </div>
                </div>

                <div>
                  <FieldLabel label="Date" />
                  <input
                    type="date"
                    value={form.date}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, date: event.target.value }))
                    }
                    className={inputClass}
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <FieldLabel label="Description" hint="Optional" />
                  <textarea
                    placeholder="Coffee with client, grocery pickup, software subscription"
                    value={form.note}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, note: event.target.value }))
                    }
                    maxLength={300}
                    className={`${inputClass} min-h-28 resize-none`}
                    rows={4}
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <label className="flex min-h-[52px] items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={form.isRecurring}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          isRecurring: event.target.checked,
                        }))
                      }
                      className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
                    />
                    Make this recurring
                  </label>

                  {form.isRecurring ? (
                    <div className="w-full sm:w-64">
                      <FieldLabel label="Frequency" />
                      <select
                        value={form.recurrenceFrequency}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            recurrenceFrequency: event.target.value as
                              | "daily"
                              | "weekly"
                              | "monthly",
                          }))
                        }
                        className={selectClass}
                      >
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>
                  ) : null}
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-1">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      This Month
                    </p>
                    <p className="mt-2 text-xl font-semibold text-slate-950">
                      {currencyFormatter.format(monthSpend)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5">
                <div>
                  <p className="text-sm text-slate-500">
                    Saved transactions appear in the ledger immediately.
                  </p>
                  {submitError ? (
                    <p className="mt-2 text-sm font-medium text-red-600">{submitError}</p>
                  ) : null}
                </div>
                <button
                  type="submit"
                  className={primaryButtonClass}
                  disabled={!canSubmitTransaction}
                >
                  Add transaction
                </button>
              </div>
            </form>
          </SectionCard>

          <SectionCard
            eyebrow="Ledger"
            title="Transaction history"
            description="Review and update one-time or recurring entries in a cleaner ledger view, including scope controls for recurring series."
          >
            <div className="mb-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <p className="text-sm text-slate-500">Current month total</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">
                  {currencyFormatter.format(monthSpend)}
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  {monthTransactions.length} transactions logged this month
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <p className="text-sm text-slate-500">Recurring series entries</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">
                  {activeRecurringSeriesCount}
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  Unique active series across daily, weekly, and monthly schedules
                </p>
              </div>
            </div>

            <ul className="space-y-4">
              {transactions.map((transaction) => (
                <li
                  key={transaction.id}
                  className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5"
                >
                  {editingId === transaction.id ? (
                    <div className="space-y-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                            Editing transaction
                          </p>
                          <h3 className="mt-2 text-lg font-semibold text-slate-950">
                            {currencyFormatter.format(transaction.amount)}
                          </h3>
                        </div>
                        <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-500">
                          {transaction.recurringSeriesId ? "Recurring" : "One-time"}
                        </span>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="md:col-span-2">
                          <FieldLabel label="Category" />
                          <select
                            value={editForm.categoryId}
                            onChange={(event) =>
                              setEditForm((current) => ({
                                ...current,
                                categoryId: event.target.value,
                              }))
                            }
                            className={selectClass}
                            required
                          >
                            <option value="">Select a category</option>
                            {categoriesForSelect.map((category) => (
                              <option key={category.id} value={category.id}>
                                {category.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <FieldLabel label="Amount" hint="USD" />
                          <div className="relative">
                            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                              $
                            </span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={editForm.amount}
                              onChange={(event) =>
                                setEditForm((current) => ({
                                  ...current,
                                  amount: event.target.value,
                                }))
                              }
                              className={`${inputClass} pl-8`}
                              required
                            />
                          </div>
                        </div>

                        <div>
                          <FieldLabel label="Date" />
                          <input
                            type="date"
                            value={editForm.date}
                            onChange={(event) =>
                              setEditForm((current) => ({
                                ...current,
                                date: event.target.value,
                              }))
                            }
                            className={inputClass}
                            required
                          />
                        </div>

                        <div className="md:col-span-2">
                          <FieldLabel label="Description" hint="Optional" />
                          <textarea
                            placeholder="Add more context for this transaction"
                            value={editForm.note}
                            onChange={(event) =>
                              setEditForm((current) => ({
                                ...current,
                                note: event.target.value,
                              }))
                            }
                            maxLength={300}
                            className={`${inputClass} min-h-28 resize-none`}
                            rows={4}
                          />
                        </div>

                        {transaction.recurringSeriesId ? (
                          <div className="md:col-span-2">
                            <FieldLabel label="Frequency" />
                            <select
                              value={editForm.recurrenceFrequency}
                              onChange={(event) =>
                                setEditForm((current) => ({
                                  ...current,
                                  recurrenceFrequency: event.target.value as
                                    | "daily"
                                    | "weekly"
                                    | "monthly",
                                }))
                              }
                              className={selectClass}
                            >
                              <option value="daily">Daily</option>
                              <option value="weekly">Weekly</option>
                              <option value="monthly">Monthly</option>
                            </select>
                          </div>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap gap-3">
                        {editError ? (
                          <p className="w-full text-sm font-medium text-red-600">{editError}</p>
                        ) : null}
                        {transaction.recurringSeriesId ? (
                          editScopeForId === transaction.id ? (
                            <>
                              <button
                                type="button"
                                onClick={() => saveEdit("this")}
                                className={primaryButtonClass}
                                disabled={!canSaveTransactionEdit}
                              >
                                Save this transaction
                              </button>
                              <button
                                type="button"
                                onClick={() => saveEdit("future")}
                                className={primaryButtonClass}
                                disabled={!canSaveTransactionEdit}
                              >
                                Save this and following
                              </button>
                              <button
                                type="button"
                                onClick={() => saveEdit("all")}
                                className={primaryButtonClass}
                                disabled={!canSaveTransactionEdit}
                              >
                                Save all transactions
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditScopeForId(null)}
                                className={subtleButtonClass}
                              >
                                Cancel scope
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setEditScopeForId(transaction.id)}
                              className={primaryButtonClass}
                              disabled={!canSaveTransactionEdit}
                            >
                              Save
                            </button>
                          )
                        ) : (
                          <button
                            type="button"
                            onClick={() => saveEdit("this")}
                            className={primaryButtonClass}
                            disabled={!canSaveTransactionEdit}
                          >
                            Save
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(null);
                            setEditScopeForId(null);
                            setEditForm(emptyForm);
                            setDeleteScopeForId(null);
                            setEditError("");
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
                              {currencyFormatter.format(transaction.amount)}
                            </h3>
                            <span className="rounded-full bg-slate-200/70 px-3 py-1 text-xs font-medium text-slate-600">
                              {transaction.categoryName}
                            </span>
                            {transaction.recurringSeriesId ? (
                              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                                Recurring
                              </span>
                            ) : null}
                            {transaction.recurringSeriesId ? (
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-medium ${
                                  transaction.recurringSeriesStatus === "active"
                                    ? "bg-sky-50 text-sky-700"
                                    : "bg-amber-50 text-amber-700"
                                }`}
                              >
                                {transaction.recurringSeriesStatus === "active"
                                  ? "Active"
                                  : "Paused"}
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-2 text-sm text-slate-500">
                            {dateFormatter.format(new Date(`${transaction.date}T00:00:00`))}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-slate-500">Type</p>
                          <p className="mt-1 text-base font-semibold text-slate-950">
                            {transaction.recurringSeriesId
                              ? transaction.recurrenceFrequency
                              : "one-time"}
                          </p>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        <div className="rounded-2xl border border-slate-200 bg-white p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                            Category
                          </p>
                          <p className="mt-2 text-sm font-medium text-slate-900">
                            {transaction.categoryName}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                            Date
                          </p>
                          <p className="mt-2 text-sm font-medium text-slate-900">
                            {transaction.date}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                            Recurrence
                          </p>
                          <p className="mt-2 text-sm font-medium text-slate-900">
                            {transaction.recurringSeriesId
                              ? transaction.recurrenceFrequency
                              : "Not recurring"}
                          </p>
                        </div>
                      </div>

                      {transaction.note ? (
                        <p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">
                          {transaction.note}
                        </p>
                      ) : null}

                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() => startEditing(transaction.id)}
                          className={subtleButtonClass}
                        >
                          Edit
                        </button>
                        {transaction.recurringSeriesId ? (
                          deleteScopeForId === transaction.id ? (
                            <>
                              <button
                                type="button"
                                onClick={async () => {
                                  const shouldDelete = window.confirm(
                                    "Delete this transaction?",
                                  );
                                  if (!shouldDelete) return;
                                  await deleteTransaction(transaction.id, "this");
                                  setDeleteScopeForId(null);
                                }}
                                className="inline-flex items-center justify-center rounded-2xl border border-red-200 bg-white px-4 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
                              >
                                Delete this
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  const shouldDelete = window.confirm(
                                    "Delete this and all following transactions?",
                                  );
                                  if (!shouldDelete) return;
                                  await deleteTransaction(transaction.id, "future");
                                  setDeleteScopeForId(null);
                                }}
                                className="inline-flex items-center justify-center rounded-2xl border border-red-200 bg-white px-4 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
                              >
                                Delete this and following
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  const shouldDelete = window.confirm(
                                    "Delete all transactions in this recurring series?",
                                  );
                                  if (!shouldDelete) return;
                                  await deleteTransaction(transaction.id, "all");
                                  setDeleteScopeForId(null);
                                }}
                                className="inline-flex items-center justify-center rounded-2xl border border-red-200 bg-white px-4 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
                              >
                                Delete all
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteScopeForId(null)}
                                className={subtleButtonClass}
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setDeleteScopeForId(transaction.id)}
                              className="inline-flex items-center justify-center rounded-2xl border border-red-200 bg-white px-4 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
                            >
                              Delete
                            </button>
                          )
                        ) : (
                          <button
                            type="button"
                            onClick={async () => {
                              const shouldDelete = window.confirm("Delete this transaction?");
                              if (!shouldDelete) return;
                              await deleteTransaction(transaction.id, "this");
                            }}
                            className="inline-flex items-center justify-center rounded-2xl border border-red-200 bg-white px-4 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </li>
              ))}
              {transactions.length === 0 ? (
                <li className="rounded-3xl border border-dashed border-slate-300 bg-slate-50/80 p-8 text-center text-sm text-slate-500">
                  No transactions yet. Add your first transaction to start building a
                  cleaner spending history.
                </li>
              ) : null}
            </ul>
          </SectionCard>
        </div>
      </div>
    </main>
  );
}
