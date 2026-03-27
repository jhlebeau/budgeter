"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo } from "react";
import { useBudget } from "../../budget-context";
import { isMonthInRange } from "@/lib/month-utils";
import { UNASSIGNED_CATEGORY_NAME } from "@/lib/spending-category-constants";
import { reportsTheme as theme } from "../../ui/dashboard-theme";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const monthFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
});

const surfaceClass = theme.surface;

const formatMonthLabel = (monthKey: string) => {
  const [yearText, monthText] = monthKey.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  return monthFormatter.format(new Date(year, month - 1, 1));
};

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

export default function SpendingMonthPage() {
  const { month } = useParams<{ month: string }>();
  const { categories, savingCategories, transactions, incomes } = useBudget();

  const isValidMonth =
    /^\d{4}-\d{2}$/.test(month) &&
    Number(month.slice(5, 7)) >= 1 &&
    Number(month.slice(5, 7)) <= 12;

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

  const regularSpendingByCategory = useMemo(() => {
    if (!isValidMonth) return [];

    return categories
      .filter((category) => category.name !== UNASSIGNED_CATEGORY_NAME)
      .map((category) => {
        const currentSpend = transactions
          .filter(
            (transaction) =>
              transaction.categoryId === category.id &&
              transaction.date.startsWith(month),
          )
          .reduce((total, transaction) => total + transaction.amount, 0);

        const maxSpend =
          category.limitType === "amount"
            ? category.limitValue
            : (monthlyIncome * category.limitValue) / 100;

        return {
          category: category.name,
          currentSpend,
          maxSpend,
          spendLeft: maxSpend - currentSpend,
        };
      });
  }, [categories, isValidMonth, month, monthlyIncome, transactions]);

  const unassignedCurrentSpend = useMemo(() => {
    if (!isValidMonth) return 0;
    const unassignedCategoryId = categories.find(
      (category) => category.name === UNASSIGNED_CATEGORY_NAME,
    )?.id;
    if (!unassignedCategoryId) return 0;
    return transactions
      .filter(
        (transaction) =>
          transaction.categoryId === unassignedCategoryId &&
          transaction.date.startsWith(month),
      )
      .reduce((total, transaction) => total + transaction.amount, 0);
  }, [categories, isValidMonth, month, transactions]);

  const totalSpending = useMemo(
    () =>
      regularSpendingByCategory.reduce(
        (total, category) => total + category.currentSpend,
        0,
      ) + unassignedCurrentSpend,
    [regularSpendingByCategory, unassignedCurrentSpend],
  );

  const regularCategorySpendingTotal = useMemo(
    () =>
      regularSpendingByCategory.reduce(
        (total, category) => total + category.currentSpend,
        0,
      ),
    [regularSpendingByCategory],
  );

  const totalBudgetedSpending = useMemo(
    () =>
      regularSpendingByCategory.reduce((total, category) => total + category.maxSpend, 0),
    [regularSpendingByCategory],
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

  const additionalBudgetedSpendingThisMonth =
    totalBudgetedSpending - regularCategorySpendingTotal;
  const unassignedMaxSpend =
    monthlyIncome - totalBudgetedSpending - totalBudgetedSavings;
  const unassignedIncome = unassignedMaxSpend - unassignedCurrentSpend;

  const spendingByCategory = useMemo(
    () => [
      ...regularSpendingByCategory,
      {
        category: UNASSIGNED_CATEGORY_NAME,
        currentSpend: unassignedCurrentSpend,
        maxSpend: unassignedMaxSpend,
        spendLeft: unassignedIncome,
      },
    ],
    [
      regularSpendingByCategory,
      unassignedCurrentSpend,
      unassignedIncome,
      unassignedMaxSpend,
    ],
  );

  return (
    <main className={theme.page}>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className={`${surfaceClass} overflow-hidden p-6 sm:p-8`}>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
                <Link href="/spending" className={theme.breadcrumb}>
                  Spending Reports
                </Link>
                <span className={theme.hint}>/</span>
                <Link href="/home" className={theme.breadcrumb}>
                  Home
                </Link>
              </div>
              <p className={`text-xs font-semibold uppercase tracking-[0.28em] ${theme.eyebrow}`}>
                Monthly Spending Report
              </p>
              <h1 className={`mt-3 text-3xl font-semibold tracking-tight sm:text-4xl ${theme.heading}`}>
                {isValidMonth ? formatMonthLabel(month) : "Invalid Month"}
              </h1>
              <p className={`mt-4 max-w-2xl text-sm leading-6 sm:text-base ${theme.body}`}>
                Compare income with savings targets and real spending, while monitoring
                additional unassigned cash.
              </p>
            </div>
            {isValidMonth ? (
              <div className="grid w-full gap-3 sm:grid-cols-2 lg:max-w-md">
                <div className="rounded-2xl border border-rose-400/25 bg-slate-900/70 p-4">
                  <p className="text-sm text-slate-300">Income this month</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-50">
                    {currencyFormatter.format(monthlyIncome)}
                  </p>
                </div>
                <div className="rounded-2xl border border-rose-400/25 bg-slate-900/70 p-4">
                  <p className="text-sm text-slate-300">Total spent</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-50">
                    {currencyFormatter.format(totalSpending)}
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </header>

        {isValidMonth ? (
          <>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label="Income this month"
                value={currencyFormatter.format(monthlyIncome)}
                detail="Post-tax income active during the selected month"
              />
              <MetricCard
                label="Total spent"
                value={currencyFormatter.format(totalSpending)}
                detail="Includes regular category spend and unassigned transactions"
              />
              <MetricCard
                label="Budgeted savings"
                value={currencyFormatter.format(totalBudgetedSavings)}
                detail="Savings planned from current category targets"
              />
              <MetricCard
                label="Unspent, unassigned"
                value={currencyFormatter.format(unassignedIncome)}
                detail="What remains after planned spending, savings, and actual unassigned spend"
              />
            </section>

            <div className="grid gap-6">
              <SectionCard
                eyebrow="Summary"
                title="Monthly financial picture"
                description="Use this summary to compare what came in, what was spent, what was planned, and what remains unassigned."
              >
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  <div className="rounded-2xl border border-rose-400/20 bg-slate-950/85 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-200/70">
                      Income
                    </p>
                    <p className="mt-2 text-xl font-semibold text-slate-50">
                      {currencyFormatter.format(monthlyIncome)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-rose-400/20 bg-slate-950/85 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-200/70">
                      Spent
                    </p>
                    <p className="mt-2 text-xl font-semibold text-slate-50">
                      {currencyFormatter.format(totalSpending)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-rose-400/20 bg-slate-950/85 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-200/70">
                      Additional Budgeted Spending
                    </p>
                    <p
                      className={`mt-2 text-xl font-semibold ${
                        additionalBudgetedSpendingThisMonth < 0
                          ? "text-red-600"
                          : "text-slate-50"
                      }`}
                    >
                      {currencyFormatter.format(additionalBudgetedSpendingThisMonth)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-rose-400/20 bg-slate-950/85 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-200/70">
                      Budgeted Savings
                    </p>
                    <p className="mt-2 text-xl font-semibold text-slate-50">
                      {currencyFormatter.format(totalBudgetedSavings)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-rose-400/20 bg-slate-950/85 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-200/70">
                      Unassigned Income
                    </p>
                    <p
                      className={`mt-2 text-xl font-semibold ${
                        unassignedIncome < 0 ? "text-red-600" : "text-slate-50"
                      }`}
                    >
                      {currencyFormatter.format(unassignedIncome)}
                    </p>
                  </div>
                </div>
              </SectionCard>

              <SectionCard
                eyebrow="Savings"
                title="Savings by category"
                description="Review the savings targets currently applied to this month before comparing them against spending."
              >
                <ul className="space-y-3">
                  {savingsByCategory.map((category) => (
                    <li
                      key={category.id}
                      className="flex items-center justify-between rounded-2xl border border-rose-400/20 bg-slate-900/72 px-4 py-4 text-sm"
                    >
                      <span className="font-medium text-slate-100">{category.name}</span>
                      <span className="font-semibold text-slate-50">
                        {currencyFormatter.format(category.amount)}
                      </span>
                    </li>
                  ))}
                  {savingsByCategory.length === 0 ? (
                    <li className="rounded-2xl border border-dashed border-rose-400/25 bg-slate-900/60 p-6 text-center text-sm text-slate-300">
                      No savings categories yet.
                    </li>
                  ) : null}
                </ul>
              </SectionCard>
            </div>

            <SectionCard
              eyebrow="Breakdown"
              title="Spending by category"
              description="Open each category to compare current spend against its limit and see how much room is left this month."
              className="overflow-hidden xl:max-h-[calc(200vh-28rem)]"
              contentClassName="min-h-0"
            >
              <ul className="space-y-4 overflow-y-auto pb-10 xl:max-h-[calc(200vh-38rem)] xl:pr-2">
                {spendingByCategory.map((category) => (
                  <li
                    key={category.category}
                    className="rounded-3xl border border-rose-400/25 bg-slate-900/72 p-5"
                  >
                    <details>
                      <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-4">
                        <div>
                          <p className="text-lg font-semibold text-slate-50">
                            {category.category}
                          </p>
                          <p className="mt-1 text-sm text-slate-300">
                            Current spending {currencyFormatter.format(category.currentSpend)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p
                            className={`text-sm font-medium ${
                              category.spendLeft < 0 ? "text-red-600" : "text-slate-200"
                            }`}
                          >
                            Spend left this month:{" "}
                            {currencyFormatter.format(category.spendLeft)}
                          </p>
                          <p className="mt-1 text-xs uppercase tracking-[0.18em] text-rose-200/60">
                            View details
                          </p>
                        </div>
                      </summary>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        <div className="rounded-2xl border border-rose-400/20 bg-slate-950/85 p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-200/70">
                            Current Spending
                          </p>
                          <p className="mt-2 text-sm font-medium text-slate-100">
                            {currencyFormatter.format(category.currentSpend)}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-rose-400/20 bg-slate-950/85 p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-200/70">
                            Maximum Spend
                          </p>
                          <p className="mt-2 text-sm font-medium text-slate-100">
                            {currencyFormatter.format(category.maxSpend)}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-rose-400/20 bg-slate-950/85 p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-200/70">
                            Spend Left
                          </p>
                          <p
                            className={`mt-2 text-sm font-medium ${
                              category.spendLeft < 0 ? "text-red-600" : "text-slate-100"
                            }`}
                          >
                            {currencyFormatter.format(category.spendLeft)}
                          </p>
                        </div>
                      </div>
                    </details>
                  </li>
                ))}
                {spendingByCategory.length === 0 ? (
                  <li className="rounded-3xl border border-dashed border-rose-400/25 bg-slate-900/60 p-8 text-center text-sm text-slate-300">
                    No spending categories yet.
                  </li>
                ) : null}
              </ul>
            </SectionCard>
          </>
        ) : (
          <SectionCard
            eyebrow="Invalid Route"
            title="The selected month is not valid"
            description="Use a month in `YYYY-MM` format to open a spending report."
          >
            <p className="text-sm font-medium text-red-600">
              The month in the URL is not valid. Use `YYYY-MM` format.
            </p>
          </SectionCard>
        )}
      </div>
    </main>
  );
}
