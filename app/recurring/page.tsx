"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useBudget } from "../budget-context";
import { ApiRecurringSeries, RecurringSeries, toRecurringSeries } from "@/lib/budget-types";
import { UNASSIGNED_CATEGORY_NAME } from "@/lib/spending-category-constants";
import { transactionsTheme as theme } from "../ui/dashboard-theme";

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

type EditForm = {
  amount: string;
  description: string;
  categoryId: string;
  frequency: "DAILY" | "WEEKLY" | "MONTHLY";
  startDate: string;
};

export default function RecurringPage() {
  const { categories } = useBudget();
  const [series, setSeries] = useState<RecurringSeries[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({
    amount: "",
    description: "",
    categoryId: "",
    frequency: "MONTHLY",
    startDate: "",
  });
  const [editError, setEditError] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchSeries = useCallback(() => {
    setLoading(true);
    fetch("/api/recurring-series")
      .then((r) => (r.ok ? (r.json() as Promise<ApiRecurringSeries[]>) : null))
      .then((data) => {
        if (!data) return;
        setSeries(data.map(toRecurringSeries));
      })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchSeries();
  }, [fetchSeries]);

  const categoriesForSelect = useMemo(() => {
    const unassigned = categories.find((c) => c.name === UNASSIGNED_CATEGORY_NAME);
    const others = categories.filter((c) => c.name !== UNASSIGNED_CATEGORY_NAME);
    return unassigned ? [...others, unassigned] : others;
  }, [categories]);

  const startEditing = (s: RecurringSeries) => {
    setEditingId(s.id);
    setEditError("");
    setEditForm({
      amount: String(s.amount),
      description: s.description ?? "",
      categoryId: s.categoryId,
      frequency: s.frequency.toUpperCase() as "DAILY" | "WEEKLY" | "MONTHLY",
      startDate: s.startDate,
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditError("");
  };

  const saveEdit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    const parsedAmount = parseNonNegativeNumberInput(editForm.amount);
    if (parsedAmount === null) {
      setEditError("Enter a valid amount.");
      return;
    }
    if (!editForm.categoryId) {
      setEditError("Select a category.");
      return;
    }

    if (!editForm.startDate) {
      setEditError("Enter a valid start date.");
      return;
    }

    setSaving(true);
    setEditError("");
    try {
      const res = await fetch(`/api/recurring-series/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parsedAmount,
          description: editForm.description.trim() || null,
          categoryId: editForm.categoryId,
          frequency: editForm.frequency,
          startDate: editForm.startDate,
        }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setEditError(data.error ?? "Failed to update series.");
        return;
      }
      setEditingId(null);
      fetchSeries();
    } finally {
      setSaving(false);
    }
  };

  const handlePause = async (id: string) => {
    await fetch(`/api/recurring-series/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "pause" }),
    });
    fetchSeries();
  };

  const handleResume = async (id: string) => {
    await fetch(`/api/recurring-series/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "resume" }),
    });
    fetchSeries();
  };

  const handleDelete = async (id: string, description: string | null, amount: number) => {
    const label = description ?? currencyFormatter.format(amount);
    const confirmed = window.confirm(
      `Delete the "${label}" recurring series and all its transactions? This cannot be undone.`,
    );
    if (!confirmed) return;
    await fetch(`/api/recurring-series/${id}`, { method: "DELETE" });
    fetchSeries();
  };

  const activeSeries = series.filter((s) => !s.isPaused);
  const pausedSeries = series.filter((s) => s.isPaused);

  return (
    <main className={theme.page}>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className={`${surfaceClass} overflow-hidden p-6 sm:p-8`}>
          <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
            <Link href="/home" className={theme.breadcrumb}>
              Home
            </Link>
            <span className="text-slate-500">/</span>
            <Link href="/transactions" className={theme.breadcrumb}>
              Transactions
            </Link>
          </div>
          <p className={`text-xs font-semibold uppercase tracking-[0.28em] ${theme.eyebrow}`}>
            Recurring Series
          </p>
          <h1 className={`mt-3 text-3xl font-semibold tracking-tight sm:text-4xl ${theme.heading}`}>
            Manage recurring transactions
          </h1>
          <p className={`mt-4 max-w-2xl text-sm leading-6 sm:text-base ${theme.body}`}>
            Edit, pause, resume, or remove each active recurring schedule from one place.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-violet-400/25 bg-slate-900/70 p-4">
              <p className="text-sm text-slate-300">Total series</p>
              <p className="mt-2 text-2xl font-semibold text-slate-50">{series.length}</p>
            </div>
            <div className="rounded-2xl border border-violet-400/25 bg-slate-900/70 p-4">
              <p className="text-sm text-slate-300">Active</p>
              <p className="mt-2 text-2xl font-semibold text-slate-50">{activeSeries.length}</p>
            </div>
            <div className="rounded-2xl border border-violet-400/25 bg-slate-900/70 p-4">
              <p className="text-sm text-slate-300">Paused</p>
              <p className="mt-2 text-2xl font-semibold text-slate-50">{pausedSeries.length}</p>
            </div>
          </div>
        </header>

        <section className={surfaceClass}>
          <div className="p-6 sm:p-7">
            <p className={`text-xs font-semibold uppercase tracking-[0.24em] ${theme.eyebrow}`}>
              All series
            </p>
            <h2 className={`mt-2 text-xl font-semibold ${theme.heading}`}>
              Recurring schedules
            </h2>
          </div>

          {loading ? (
            <div className="space-y-4 px-6 pb-8 sm:px-7">
              {Array.from({ length: 3 }, (_, i) => (
                <div
                  key={i}
                  className="h-28 animate-pulse rounded-3xl bg-slate-800/50"
                />
              ))}
            </div>
          ) : series.length === 0 ? (
            <div className={`mx-6 mb-8 sm:mx-7 ${theme.emptyState}`}>
              No recurring series yet. Create one from the{" "}
              <Link href="/transactions" className={theme.breadcrumb}>
                Transactions
              </Link>{" "}
              page.
            </div>
          ) : (
            <ul className="space-y-4 px-6 pb-8 sm:px-7">
              {series.map((s) =>
                editingId === s.id ? (
                  <li
                    key={s.id}
                    className="rounded-3xl border border-violet-400/25 bg-slate-900/72 p-5"
                  >
                    <div className="mb-4 flex flex-wrap items-center gap-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-200/70">
                        Editing series
                      </p>
                    </div>
                    <form onSubmit={saveEdit} className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="md:col-span-2">
                          <label className="mb-2 block text-sm font-medium text-slate-200">
                            Category
                          </label>
                          <select
                            value={editForm.categoryId}
                            onChange={(e) =>
                              setEditForm((f) => ({ ...f, categoryId: e.target.value }))
                            }
                            className={selectClass}
                            required
                          >
                            <option value="">Select a category</option>
                            {categoriesForSelect.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-medium text-slate-200">
                            Amount
                          </label>
                          <div className="relative">
                            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                              $
                            </span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={editForm.amount}
                              onChange={(e) =>
                                setEditForm((f) => ({ ...f, amount: e.target.value }))
                              }
                              className={`${inputClass} pl-8`}
                              required
                            />
                          </div>
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-medium text-slate-200">
                            Frequency
                          </label>
                          <select
                            value={editForm.frequency}
                            onChange={(e) =>
                              setEditForm((f) => ({
                                ...f,
                                frequency: e.target.value as "DAILY" | "WEEKLY" | "MONTHLY",
                              }))
                            }
                            className={selectClass}
                          >
                            <option value="DAILY">Daily</option>
                            <option value="WEEKLY">Weekly</option>
                            <option value="MONTHLY">Monthly</option>
                          </select>
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-medium text-slate-200">
                            Start date
                          </label>
                          <input
                            type="date"
                            value={editForm.startDate}
                            onChange={(e) =>
                              setEditForm((f) => ({ ...f, startDate: e.target.value }))
                            }
                            className={inputClass}
                            required
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="mb-2 block text-sm font-medium text-slate-200">
                            Description{" "}
                            <span className="text-xs font-normal text-slate-400">Optional</span>
                          </label>
                          <textarea
                            value={editForm.description}
                            onChange={(e) =>
                              setEditForm((f) => ({ ...f, description: e.target.value }))
                            }
                            maxLength={300}
                            rows={3}
                            className={`${inputClass} resize-none`}
                            placeholder="e.g. Netflix subscription"
                          />
                        </div>
                      </div>

                      <p className="text-xs text-slate-400">
                        Editing a series regenerates all historical transactions with the new
                        values. Individual transactions you edited separately will be replaced.
                      </p>

                      {editError ? (
                        <p className="text-sm font-medium text-red-500">{editError}</p>
                      ) : null}

                      <div className="flex flex-wrap gap-3">
                        <button
                          type="submit"
                          className={primaryButtonClass}
                          disabled={saving}
                        >
                          {saving ? "Saving…" : "Save changes"}
                        </button>
                        <button
                          type="button"
                          onClick={cancelEditing}
                          className={subtleButtonClass}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </li>
                ) : (
                  <li
                    key={s.id}
                    className="rounded-3xl border border-violet-400/25 bg-slate-900/72 p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-lg font-semibold text-slate-50">
                            {currencyFormatter.format(s.amount)}
                          </span>
                          <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-300">
                            {s.categoryName}
                          </span>
                          <span className="rounded-full bg-violet-500/15 px-3 py-1 text-xs font-medium text-violet-200 capitalize">
                            {s.frequency}
                          </span>
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-medium ${
                              s.isPaused
                                ? "bg-amber-500/15 text-amber-200"
                                : "bg-sky-500/15 text-sky-200"
                            }`}
                          >
                            {s.isPaused ? "Paused" : "Active"}
                          </span>
                        </div>
                        {s.description ? (
                          <p className="mt-2 text-sm text-slate-300">{s.description}</p>
                        ) : null}
                        <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-400">
                          <span>
                            Started{" "}
                            {dateFormatter.format(new Date(`${s.startDate}T00:00:00`))}
                          </span>
                          <span>{s.transactionCount} transactions logged</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => startEditing(s)}
                        className={subtleButtonClass}
                      >
                        Edit
                      </button>
                      {s.isPaused ? (
                        <button
                          type="button"
                          onClick={() => void handleResume(s.id)}
                          className={primaryButtonClass}
                        >
                          Resume
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void handlePause(s.id)}
                          className={subtleButtonClass}
                        >
                          Pause
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => void handleDelete(s.id, s.description, s.amount)}
                        className="inline-flex items-center justify-center rounded-2xl border border-red-400/35 bg-slate-950/85 px-4 py-2.5 text-sm font-medium text-red-200 transition hover:bg-red-950/60"
                      >
                        Delete all
                      </button>
                    </div>
                  </li>
                ),
              )}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
