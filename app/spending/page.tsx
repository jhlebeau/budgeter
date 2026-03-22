"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useBudget } from "../budget-context";

export default function SpendingPage() {
  const { categories, transactions } = useBudget();

  const spendingByCategory = useMemo(() => {
    const totals = categories.map((category) => ({ category, total: 0 }));

    for (const transaction of transactions) {
      const index = totals.findIndex(
        (item) => item.category === transaction.category,
      );
      if (index >= 0) {
        totals[index].total += transaction.amount;
      }
    }

    return totals;
  }, [categories, transactions]);

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-10">
      <Link href="/" className="mb-5 inline-block text-sm text-zinc-600 hover:underline">
        Back to Home
      </Link>
      <h1 className="mb-4 text-2xl font-semibold">View Spending</h1>

      <section className="rounded-lg border p-4">
        <h2 className="mb-3 text-lg font-medium">Spending by Category</h2>
        <ul className="space-y-2">
          {spendingByCategory.map((item) => (
            <li
              key={item.category}
              className="flex items-center justify-between rounded border px-3 py-2 text-sm"
            >
              <span>{item.category}</span>
              <span className="font-medium">${item.total.toFixed(2)}</span>
            </li>
          ))}
          {spendingByCategory.length === 0 ? (
            <li className="text-sm text-zinc-500">No categories yet.</li>
          ) : null}
        </ul>
      </section>
    </main>
  );
}
