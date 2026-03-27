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
      if (!Number.isInteger(transactionYear) || !Number.isInteger(transactionMonth) || transactionMonth < 1 || transactionMonth > 12) {
        continue;
      }
      monthKeys.add(`${transactionYear}-${String(transactionMonth).padStart(2, "0")}`);
    }
    return [...monthKeys].sort().reverse();
  }, [currentMonthKey, transactions]);

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,_#020617_0%,_#111827_100%)] px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <section className="rounded-[2rem] border border-rose-400/20 bg-slate-900/78 p-6 shadow-[0_30px_100px_-42px_rgba(190,24,93,0.4)] backdrop-blur-xl sm:p-8">
          <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
            <Link href="/home" className="text-rose-200 transition hover:text-white">
              Home
            </Link>
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-rose-200/70">
            Spending Reports
          </p>
          <h1 className="mt-3 font-display text-5xl leading-none text-slate-50">
            Select a month
          </h1>
          <p className="mt-4 text-sm leading-7 text-slate-300">
            Choose a month to view the spending report.
          </p>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {months.map((monthKey) => (
            <Link
              key={monthKey}
              href={`/spending/${monthKey}`}
              className="rounded-[1.75rem] border border-rose-400/25 bg-slate-900/78 p-6 text-sm font-medium text-slate-100 shadow-[0_18px_60px_-40px_rgba(190,24,93,0.45)] transition hover:-translate-y-1 hover:bg-slate-900"
            >
              {formatMonthLabel(monthKey)}
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}
