"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useBudget } from "../budget-context";
import { getCurrentMonthKey } from "@/lib/month-utils";

const monthFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
});

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
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(244,114,182,0.16),_transparent_24%),radial-gradient(circle_at_bottom_right,_rgba(56,189,248,0.14),_transparent_28%),linear-gradient(180deg,_#fff7fb_0%,_#fdf2f8_45%,_#f8fafc_100%)] px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <section className="rounded-[2rem] border border-rose-100/80 bg-white/82 p-6 shadow-[0_30px_100px_-42px_rgba(190,24,93,0.32)] backdrop-blur-xl sm:p-8">
          <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
            <Link href="/home" className="text-rose-800/70 transition hover:text-rose-950">
              Home
            </Link>
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-rose-700/60">
            Spending Reports
          </p>
          <h1 className="mt-3 font-display text-5xl leading-none text-slate-950">
            Select a month
          </h1>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            Choose a month to view the spending report.
          </p>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {months.map((monthKey) => (
            <Link
              key={monthKey}
              href={`/spending/${monthKey}`}
              className="rounded-[1.75rem] border border-rose-200/80 bg-white/80 p-6 text-sm font-medium text-slate-900 shadow-[0_18px_60px_-40px_rgba(190,24,93,0.35)] transition hover:-translate-y-1 hover:border-rose-300 hover:bg-rose-50/80"
            >
              {formatMonthLabel(monthKey)}
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}
