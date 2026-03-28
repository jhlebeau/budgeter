"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useBudget, ApiTransaction, toTransaction, Transaction } from "../budget-context";
import { UNASSIGNED_CATEGORY_NAME } from "@/lib/spending-category-constants";
import { getCurrentMonthKey } from "@/lib/month-utils";
import { transactionsTheme as theme } from "../ui/dashboard-theme";

const PAGE_SIZE = 25;

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

const isValidDateInput = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

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

type PagedResponse = {
  transactions: ApiTransaction[];
  total: number;
  page: number;
  pageSize: number;
  monthSpend: number;
  monthCount: number;
  activeRecurringSeriesCount: number;
};

export default function TransactionsPage() {
  const { categories, addTransaction, updateTransaction, deleteTransaction } = useBudget();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [monthSpend, setMonthSpend] = useState(0);
  const [monthCount, setMonthCount] = useState(0);
  const [activeRecurringSeriesCount, setActiveRecurringSeriesCount] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchTransactions = useCallback(
    (targetPage: number) => {
      setLoading(true);
      fetch(`/api/transactions?page=${targetPage}&pageSize=${PAGE_SIZE}`)
        .then((r) => (r.ok ? (r.json() as Promise<PagedResponse>) : null))
        .then((data) => {
          if (!data) return;
          setTransactions(data.transactions.map(toTransaction));
          setTotal(data.total);
          setPage(data.page);
          setMonthSpend(data.monthSpend);
          setMonthCount(data.monthCount);
          setActiveRecurringSeriesCount(data.activeRecurringSeriesCount);
        })
        .catch(() => null)
        .finally(() => setLoading(false));
    },
    [],
  );

  useEffect(() => {
    fetchTransactions(page);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  const refresh = (targetPage = 0) => {
    setPage(targetPage);
    setRefreshKey((k) => k + 1);
  };

  const [form, setForm] = useState<FormData>(() => ({
    ...emptyForm,
    date: getDefaultDate(),
  }));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormData>(emptyForm);
  const [submitError, setSubmitError] = useState("");
  const [editError, setEditError] = useState("");
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

    setForm({ ...emptyForm, date: getDefaultDate() });
    refresh(0);
  };

  const startEditing = (id: string) => {
    const transaction = transactions.find((item) => item.id === id);
    if (!transaction) return;

    setEditingId(id);
    setEditForm({
      amount: String(transaction.amount),
      categoryId: transaction.categoryId,
      date: transaction.date,
      note: transaction.note,
      isRecurring: false,
      recurrenceFrequency: "monthly",
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
    setEditForm(emptyForm);
    setEditError("");
    refresh(page);
  };

  void currentMonthKey;

  return (
    <main className={theme.page}>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className={`${surfaceClass} overflow-hidden p-6 sm:p-8`}>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
                <Link href="/home" className={theme.breadcrumb}>
                  Home
                </Link>
              </div>
              <p className={`text-xs font-semibold uppercase tracking-[0.28em] ${theme.eyebrow}`}>
                Transaction Dashboard
              </p>
              <h1 className={`mt-3 text-3xl font-semibold tracking-tight sm:text-4xl ${theme.heading}`}>
                Record transactions with a clearer daily workflow
              </h1>
              <p className={`mt-4 max-w-2xl text-sm leading-6 sm:text-base ${theme.body}`}>
                Log one-off and recurring spending, keep categories organized, and
                maintain a cleaner history of what moved this month.
              </p>
            </div>
            <div className="flex w-full flex-col gap-3 lg:max-w-md">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-violet-400/25 bg-slate-900/70 p-4">
                  <p className="text-sm text-slate-300">This month</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-50">
                    {currencyFormatter.format(monthSpend)}
                  </p>
                </div>
                <div className="rounded-2xl border border-violet-400/25 bg-slate-900/70 p-4">
                  <p className="text-sm text-slate-300">Transactions tracked</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-50">
                    {total}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link href="/recurring" className={subtleButtonClass}>
                  Manage recurring
                </Link>
                <a
                  href="/api/transactions/export"
                  download="transactions.csv"
                  className={subtleButtonClass}
                >
                  Export CSV
                </a>
              </div>
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-2">
          <MetricCard
            label="Monthly spend logged"
            value={currencyFormatter.format(monthSpend)}
            detail={`Across ${monthCount} transaction${monthCount === 1 ? "" : "s"} this month`}
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

              <div className="rounded-2xl border border-violet-400/25 bg-slate-900/70 p-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <label className="flex min-h-[52px] items-center gap-3 rounded-2xl border border-violet-400/25 bg-slate-950/80 px-4 py-3 text-sm text-slate-200">
                    <input
                      type="checkbox"
                      checked={form.isRecurring}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          isRecurring: event.target.checked,
                        }))
                      }
                      className="h-4 w-4 rounded border-violet-400/30 bg-slate-950 text-violet-300 focus:ring-violet-400/30"
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
                  <div className="rounded-2xl border border-violet-400/20 bg-slate-950/85 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-200/70">
                      This Month
                    </p>
                    <p className="mt-2 text-xl font-semibold text-slate-50">
                      {currencyFormatter.format(monthSpend)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5">
                <div>
                  <p className="text-sm text-slate-300">
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
            className="flex flex-col overflow-hidden xl:max-h-[calc(170vh-23.8rem)]"
            contentClassName="flex min-h-0 flex-1 flex-col"
          >
            <div className="mb-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-violet-400/25 bg-slate-900/70 p-4">
                <p className="text-sm text-slate-300">Current month total</p>
                <p className="mt-2 text-2xl font-semibold text-slate-50">
                  {currencyFormatter.format(monthSpend)}
                </p>
                <p className="mt-2 text-sm text-slate-300">
                  {monthCount} transactions logged this month
                </p>
              </div>
              <div className="rounded-2xl border border-violet-400/25 bg-slate-900/70 p-4">
                <p className="text-sm text-slate-300">Recurring series entries</p>
                <p className="mt-2 text-2xl font-semibold text-slate-50">
                  {activeRecurringSeriesCount}
                </p>
                <p className="mt-2 text-sm text-slate-300">
                  Unique active series across daily, weekly, and monthly schedules
                </p>
              </div>
            </div>

            <ul className="min-h-0 flex-1 space-y-4 overflow-y-auto pb-10 xl:pr-2">
              {loading ? (
                Array.from({ length: 3 }, (_, i) => (
                  <li key={i} className="h-[88px] animate-pulse rounded-3xl bg-slate-800/50" />
                ))
              ) : null}
              {!loading && transactions.map((transaction) => (
                <li
                  key={transaction.id}
                  className="rounded-3xl border border-violet-400/25 bg-slate-900/72 p-5"
                >
                  {editingId === transaction.id ? (
                    <div className="space-y-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-200/70">
                            Editing transaction
                          </p>
                          <h3 className="mt-2 text-lg font-semibold text-slate-50">
                            {currencyFormatter.format(transaction.amount)}
                          </h3>
                        </div>
                        <span className="rounded-full border border-violet-400/25 bg-slate-950/80 px-3 py-1 text-xs font-medium text-violet-200">
                          One-time
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

                      </div>

                      <div className="flex flex-wrap gap-3">
                        {editError ? (
                          <p className="w-full text-sm font-medium text-red-600">{editError}</p>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => saveEdit("this")}
                          className={primaryButtonClass}
                          disabled={!canSaveTransactionEdit}
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(null);
                            setEditForm(emptyForm);
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
                            <h3 className="text-lg font-semibold text-slate-50">
                              {currencyFormatter.format(transaction.amount)}
                            </h3>
                            <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-300">
                              {transaction.categoryName}
                            </span>
                            {transaction.recurringSeriesId ? (
                              <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-200">
                                Recurring
                              </span>
                            ) : null}
                            {transaction.recurringSeriesId ? (
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-medium ${
                                  transaction.recurringSeriesStatus === "active"
                                    ? "bg-sky-500/15 text-sky-200"
                                    : "bg-amber-500/15 text-amber-200"
                                }`}
                              >
                                {transaction.recurringSeriesStatus === "active"
                                  ? "Active"
                                  : "Paused"}
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-2 text-sm text-slate-300">
                            {dateFormatter.format(new Date(`${transaction.date}T00:00:00`))}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-slate-300">Type</p>
                          <p className="mt-1 text-base font-semibold text-slate-50">
                            {transaction.recurringSeriesId
                              ? transaction.recurrenceFrequency
                              : "one-time"}
                          </p>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        <div className="rounded-2xl border border-violet-400/20 bg-slate-950/85 p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-200/70">
                            Category
                          </p>
                          <p className="mt-2 text-sm font-medium text-slate-100">
                            {transaction.categoryName}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-violet-400/20 bg-slate-950/85 p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-200/70">
                            Date
                          </p>
                          <p className="mt-2 text-sm font-medium text-slate-100">
                            {transaction.date}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-violet-400/20 bg-slate-950/85 p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-200/70">
                            Recurrence
                          </p>
                          <p className="mt-2 text-sm font-medium text-slate-100">
                            {transaction.recurringSeriesId
                              ? transaction.recurrenceFrequency
                              : "Not recurring"}
                          </p>
                        </div>
                      </div>

                      {transaction.note ? (
                        <p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-300">
                          {transaction.note}
                        </p>
                      ) : null}

                      <div className="flex flex-wrap gap-3">
                        {transaction.recurringSeriesId ? (
                          <Link href="/recurring" className={subtleButtonClass}>
                            Manage
                          </Link>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => startEditing(transaction.id)}
                              className={subtleButtonClass}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                const shouldDelete = window.confirm("Delete this transaction?");
                                if (!shouldDelete) return;
                                await deleteTransaction(transaction.id, "this");
                                refresh(0);
                              }}
                              className="inline-flex items-center justify-center rounded-2xl border border-red-400/35 bg-slate-950/85 px-4 py-2.5 text-sm font-medium text-red-200 transition hover:bg-red-950/60"
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </li>
              ))}
              {!loading && total === 0 ? (
                <li className="rounded-3xl border border-dashed border-violet-400/25 bg-slate-900/60 p-8 text-center text-sm text-slate-300">
                  No transactions yet. Add your first transaction to start building a
                  cleaner spending history.
                </li>
              ) : null}
            </ul>

            {total > PAGE_SIZE ? (
              <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4 text-sm text-slate-400">
                <span>
                  {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={page === 0}
                    onClick={() => {
                      const prev = page - 1;
                      setPage(prev);
                      fetchTransactions(prev);
                    }}
                    className="rounded-xl border border-violet-400/25 bg-slate-950/80 px-3 py-1.5 text-violet-200 transition hover:bg-violet-950/40 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={(page + 1) * PAGE_SIZE >= total}
                    onClick={() => {
                      const next = page + 1;
                      setPage(next);
                      fetchTransactions(next);
                    }}
                    className="rounded-xl border border-violet-400/25 bg-slate-950/80 px-3 py-1.5 text-violet-200 transition hover:bg-violet-950/40 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            ) : null}
          </SectionCard>
        </div>
      </div>
    </main>
  );
}
