"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo } from "react";
import { useBudget } from "../../budget-context";
import { isMonthInRange } from "@/lib/month-utils";

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

export default function SpendingMonthPage() {
  const { month } = useParams<{ month: string }>();
  const { categories, savingCategories, transactions, incomes } = useBudget();

  const monthlyIncome = useMemo(
    () =>
      incomes.reduce(
        (total, income) =>
          isMonthInRange(month, income.startMonth, income.endMonth)
            ? total + income.postTaxAmount
            : total,
        0,
      ),
    [incomes, month],
  );

  const isValidMonth =
    /^\d{4}-\d{2}$/.test(month) && Number(month.slice(5, 7)) >= 1 && Number(month.slice(5, 7)) <= 12;

  const spendingByCategory = useMemo(() => {
    if (!isValidMonth) return [];

    return categories.map((category) => {
      const currentSpend = transactions
        .filter(
          (transaction) =>
            transaction.categoryId === category.id &&
            transaction.date.startsWith(month),
        )
        .reduce((total, transaction) => total + transaction.amount, 0);

      return {
        category: category.name,
        currentSpend,
        maxSpend:
          category.limitType === "amount"
            ? category.limitValue
            : (monthlyIncome * category.limitValue) / 100,
        spendLeft:
          (category.limitType === "amount"
            ? category.limitValue
            : (monthlyIncome * category.limitValue) / 100) - currentSpend,
      };
    });
  }, [categories, isValidMonth, month, monthlyIncome, transactions]);

  const totalSpending = useMemo(
    () =>
      spendingByCategory.reduce(
        (total, category) => total + category.currentSpend,
        0,
      ),
    [spendingByCategory],
  );
  const totalBudgetedSpending = useMemo(
    () =>
      spendingByCategory.reduce((total, category) => total + category.maxSpend, 0),
    [spendingByCategory],
  );

  const totalBudgetedSavings = useMemo(
    () =>
      savingCategories.reduce(
        (total, category) =>
          total +
          (category.limitType === "amount"
            ? category.limitValue
            : (monthlyIncome * category.limitValue) / 100),
        0,
      ),
    [monthlyIncome, savingCategories],
  );

  const savingsByCategory = useMemo(
    () =>
      savingCategories.map((category) => ({
        id: category.id,
        name: category.name,
        amount:
          category.limitType === "amount"
            ? category.limitValue
            : (monthlyIncome * category.limitValue) / 100,
      })),
    [monthlyIncome, savingCategories],
  );

  const totalSpendLeft = totalBudgetedSpending - totalSpending;
  const additionalIncome = monthlyIncome - totalBudgetedSavings - totalSpending;

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-10">
      <Link
        href="/spending"
        className="mb-5 inline-block text-sm text-zinc-600 hover:underline"
      >
        Back to Months
      </Link>
      <h1 className="mb-4 text-2xl font-semibold">
        {isValidMonth ? formatMonthLabel(month) : "Invalid Month"}
      </h1>

      {isValidMonth ? (
        <section className="rounded-lg border p-4">
          <h2 className="mb-3 text-lg font-medium">Summary</h2>
          <div className="mb-3 rounded border px-3 py-2 text-sm">
            <p>Income This Month: {currencyFormatter.format(monthlyIncome)}</p>
            <p>Total Spent: {currencyFormatter.format(totalSpending)}</p>
            <p className={totalSpendLeft < 0 ? "text-red-600" : ""}>
              Spend Left This Month: {currencyFormatter.format(totalSpendLeft)}
            </p>
            <p>Budgeted Savings: {currencyFormatter.format(totalBudgetedSavings)}</p>
            <p className={additionalIncome < 0 ? "text-red-600" : ""}>
              Leftover Income: {currencyFormatter.format(additionalIncome)}
            </p>
          </div>
          <h2 className="mb-3 text-lg font-medium">Spending by Category</h2>
          <ul className="space-y-2">
            {spendingByCategory.map((category) => (
              <li key={category.category} className="rounded border px-3 py-2 text-sm">
                <details>
                  <summary className="flex cursor-pointer list-none items-center justify-between font-medium">
                    <span>{category.category}</span>
                    <span className="flex items-center gap-2">
                      <span className={category.spendLeft < 0 ? "text-red-600" : ""}>
                        Spend left this month:{" "}
                        {currencyFormatter.format(category.spendLeft)}
                      </span>
                      <span className="text-zinc-500">▾</span>
                    </span>
                  </summary>
                  <div className="mt-2 space-y-1">
                    <p>
                      Current spending:{" "}
                      {currencyFormatter.format(category.currentSpend)}
                    </p>
                    <p>Maximum spend: {currencyFormatter.format(category.maxSpend)}</p>
                  </div>
                </details>
              </li>
            ))}
            {spendingByCategory.length === 0 ? (
              <li className="text-sm text-zinc-500">No categories yet.</li>
            ) : null}
          </ul>

          <h2 className="mt-6 mb-3 text-lg font-medium">Savings By Category</h2>
          <ul className="space-y-2">
            {savingsByCategory.map((category) => (
              <li
                key={category.id}
                className="flex items-center justify-between rounded border px-3 py-2 text-sm"
              >
                <span>{category.name}</span>
                <span className="font-medium">
                  {currencyFormatter.format(category.amount)}
                </span>
              </li>
            ))}
            {savingsByCategory.length === 0 ? (
              <li className="text-sm text-zinc-500">No savings categories yet.</li>
            ) : null}
          </ul>
        </section>
      ) : (
        <p className="text-sm text-red-600">
          The month in the URL is not valid. Use YYYY-MM format.
        </p>
      )}
    </main>
  );
}
