"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useBudget } from "../budget-context";

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

  const months = useMemo(() => {
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(
      now.getMonth() + 1,
    ).padStart(2, "0")}`;

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

    const orderedMonths = [...monthKeys].sort().reverse();

    return orderedMonths.map((monthKey) => ({
      monthKey,
      monthLabel: formatMonthLabel(monthKey),
    }));
  }, [transactions]);

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-10">
      <Link href="/home" className="mb-5 inline-block text-sm text-zinc-600 hover:underline">
        Back to Home
      </Link>
      <h1 className="mb-4 text-2xl font-semibold">View Spending</h1>

      <section className="rounded-lg border p-4">
        <h2 className="mb-3 text-lg font-medium">Select a Month</h2>
        <div className="flex flex-col gap-2">
          {months.map((month) => (
            <Link
              key={month.monthKey}
              href={`/spending/${month.monthKey}`}
              className="rounded border px-3 py-2 text-sm font-medium hover:bg-zinc-50"
            >
              {month.monthLabel}
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
