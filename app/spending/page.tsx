"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useBudget } from "../budget-context";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

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
  const { categories, transactions } = useBudget();

  const spendingByMonth = useMemo(() => {
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(
      now.getMonth() + 1,
    ).padStart(2, "0")}`;

    const monthlyTransactions: Array<{
      amount: number;
      category: string;
      monthKey: string;
    }> = [];
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
      monthlyTransactions.push({
        amount: transaction.amount,
        category: transaction.category,
        monthKey,
      });
    }

    const orderedMonths = [...monthKeys].sort().reverse();

    return orderedMonths.map((monthKey) => ({
      monthKey,
      monthLabel: formatMonthLabel(monthKey),
      categories: categories.map((category) => {
        const currentSpend = monthlyTransactions
          .filter(
            (transaction) =>
              transaction.category === category.name &&
              transaction.monthKey === monthKey,
          )
          .reduce((total, transaction) => total + transaction.amount, 0);

        return {
          category: category.name,
          currentSpend,
          maxSpend: category.monthlyLimit,
          spendLeft: category.monthlyLimit - currentSpend,
        };
      }),
    }));
  }, [categories, transactions]);

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-10">
      <Link href="/" className="mb-5 inline-block text-sm text-zinc-600 hover:underline">
        Back to Home
      </Link>
      <h1 className="mb-4 text-2xl font-semibold">View Spending</h1>

      <section className="rounded-lg border p-4">
        <h2 className="mb-3 text-lg font-medium">Spending by Month</h2>
        <ul className="space-y-2">
          {spendingByMonth.map((month) => (
            <li
              key={month.monthKey}
              className="rounded border px-3 py-2 text-sm"
            >
              <p className="mb-2 font-medium">{month.monthLabel}</p>
              <ul className="space-y-2">
                {month.categories.map((category) => (
                  <li
                    key={`${month.monthKey}-${category.category}`}
                    className="rounded border px-3 py-2"
                  >
                    <p className="font-medium">{category.category}</p>
                    <p>
                      Current spending:{" "}
                      {currencyFormatter.format(category.currentSpend)}
                    </p>
                    <p>
                      Maximum spend: {currencyFormatter.format(category.maxSpend)}
                    </p>
                    <p className={category.spendLeft < 0 ? "text-red-600" : ""}>
                      Spend left this month:{" "}
                      {currencyFormatter.format(category.spendLeft)}
                    </p>
                  </li>
                ))}
              </ul>
            </li>
          ))}
          {spendingByMonth.length === 0 ? (
            <li className="text-sm text-zinc-500">No categories yet.</li>
          ) : null}
        </ul>
      </section>
    </main>
  );
}
