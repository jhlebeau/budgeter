"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useBudget } from "../budget-context";
import { getCurrentMonthKey } from "@/lib/month-utils";

const monthFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
});

const surfaceClass =
  "rounded-3xl border border-slate-200/80 bg-white/90 shadow-[0_18px_60px_-32px_rgba(15,23,42,0.35)] backdrop-blur";

const formatMonthLabel = (monthKey: string) => {
  const [yearText, monthText] = monthKey.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  return monthFormatter.format(new Date(year, month - 1, 1));
};

export default function SpendingPage() {
  const { transactions } = useBudget();
  const currentMonthKey = getCurrentMonthKey();

  const months = useMemo(() => {
    const monthKeys = new Set<string>([currentMonthKey]);

    for (const transaction of transactions) {
      const [yearText, monthText] = transaction.date.split("-");
      const transactionYear = Number(yearText);
      const transactionMonth = Number(monthText);
      if (
        !Number.isInteger(transactionYear) ||
        !Number.isInteger(transactionMonth) ||
        transactionMonth < 1 ||
        transactionMonth > 12
      ) {
        continue;
      }

      const monthKey = `${transactionYear}-${String(transactionMonth).padStart(2, "0")}`;
      monthKeys.add(monthKey);
    }

    return [...monthKeys].sort().reverse();
  }, [currentMonthKey, transactions]);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(148,163,184,0.16),_transparent_36%),linear-gradient(180deg,_#f8fafc_0%,_#eef2f7_100%)] px-4 py-10 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <div className={`${surfaceClass} p-6 sm:p-8`}>
          <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
            <Link href="/home" className="text-slate-500 transition hover:text-slate-900">
              Home
            </Link>
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
            Spending Reports
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
            Select a month
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            Choose a month to view the spending report.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {months.map((monthKey) => (
              <Link
                key={monthKey}
                href={`/spending/${monthKey}`}
                className="rounded-3xl border border-slate-200 bg-slate-50/70 px-5 py-5 text-sm font-medium text-slate-900 transition hover:border-slate-300 hover:bg-white"
              >
                {formatMonthLabel(monthKey)}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
