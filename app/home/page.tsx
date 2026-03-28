"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useBudget } from "../budget-context";
import { getCurrentMonthKey, isMonthInRange } from "@/lib/month-utils";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const actions = [
  { href: "/setup", title: "Set Income, Spending, and Savings", description: "Tune the foundation of your plan.", accent: "border-cyan-400/25" },
  { href: "/transactions", title: "Record Transaction", description: "Keep daily spending current.", accent: "border-violet-400/25" },
  { href: "/spending", title: "View Spending", description: "Check Monthly Performance", accent: "border-rose-400/25" },
];

type MonthStats = {
  monthSpend: number;
  monthCount: number;
};

function StatCard({
  label,
  value,
  valueClass,
  loading,
}: {
  label: string;
  value: string;
  valueClass?: string;
  loading: boolean;
}) {
  return (
    <div className="rounded-[1.75rem] border border-emerald-400/20 bg-slate-900/78 p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-200/60">{label}</p>
      {loading ? (
        <div className="mt-3 h-8 w-28 animate-pulse rounded-lg bg-slate-800/70" />
      ) : (
        <p className={`mt-3 text-2xl font-semibold tracking-tight ${valueClass ?? "text-slate-50"}`}>
          {value}
        </p>
      )}
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();
  const { currentUser, logout, incomes } = useBudget();
  const [stats, setStats] = useState<MonthStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) {
      router.replace("/");
    }
  }, [currentUser, router]);

  useEffect(() => {
    if (!currentUser) return;
    fetch("/api/transactions?page=0&pageSize=1")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: MonthStats | null) => { if (data) setStats(data); })
      .catch(() => null)
      .finally(() => setStatsLoading(false));
  }, [currentUser]);

  const currentMonthKey = getCurrentMonthKey();

  const monthlyIncome = useMemo(
    () =>
      incomes.reduce(
        (total, income) =>
          isMonthInRange(currentMonthKey, income.startMonth, income.endMonth)
            ? total + income.postTaxAmount
            : total,
        0,
      ),
    [incomes, currentMonthKey],
  );

  const remaining = monthlyIncome - (stats?.monthSpend ?? 0);

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,_#020617_0%,_#0f172a_55%,_#111827_100%)] px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <section className="overflow-hidden rounded-[2rem] border border-emerald-400/20 bg-slate-900/78 shadow-[0_30px_100px_-42px_rgba(22,101,52,0.45)] backdrop-blur-xl">
          <div className="grid gap-6 p-6 lg:grid-cols-[1.1fr_0.9fr] lg:p-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-200/70">
                Budget Tracker
              </p>
              <h1 className="mt-4 font-display text-5xl leading-none text-slate-50">
                Plan income, spending, and savings in one place.
              </h1>
              {currentUser ? (
                <p className="mt-5 text-sm leading-7 text-slate-300">
                  Signed in as <span className="font-semibold text-slate-100">{currentUser.username}</span>
                </p>
              ) : null}
              <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-300">
                Move from setup to transaction entry to monthly review without losing track
                of how each part of your budget connects.
              </p>
            </div>
            <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/85 p-6 text-white">
              <p className="text-xs uppercase tracking-[0.24em] text-emerald-200/70">Quick Access</p>
              <div className="mt-5 flex flex-wrap gap-3 text-sm">
                <Link href="/settings" className="rounded-full border border-white/15 px-4 py-2 text-slate-100 transition hover:bg-white/10">
                  Settings
                </Link>
                <button
                  type="button"
                  onClick={() => void logout()}
                  className="rounded-full border border-white/15 px-4 py-2 text-slate-100 transition hover:bg-white/10"
                >
                  Log Out
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Budget vs actual for current month */}
        <section>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.28em] text-emerald-200/50">
            This month
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Income"
              value={currencyFormatter.format(monthlyIncome)}
              loading={statsLoading}
            />
            <StatCard
              label="Spent"
              value={currencyFormatter.format(stats?.monthSpend ?? 0)}
              loading={statsLoading}
            />
            <StatCard
              label="Remaining"
              value={currencyFormatter.format(remaining)}
              valueClass={remaining < 0 ? "text-red-400" : "text-emerald-300"}
              loading={statsLoading}
            />
            <StatCard
              label="Transactions"
              value={String(stats?.monthCount ?? 0)}
              loading={statsLoading}
            />
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          {actions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className={`group rounded-[1.75rem] border ${action.accent} bg-slate-900/78 p-6 shadow-[0_24px_70px_-44px_rgba(2,6,23,0.8)] transition hover:-translate-y-1 hover:bg-slate-900`}
            >
              <p className="text-lg font-semibold text-slate-50">{action.title}</p>
              <p className="mt-3 text-sm leading-6 text-slate-300">{action.description}</p>
              <p className="mt-8 text-sm font-medium text-slate-200 transition group-hover:text-white">
                Open page
              </p>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}
