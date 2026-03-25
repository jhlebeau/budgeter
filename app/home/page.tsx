"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useBudget } from "../budget-context";

const surfaceClass =
  "rounded-3xl border border-slate-200/80 bg-white/90 shadow-[0_18px_60px_-32px_rgba(15,23,42,0.35)] backdrop-blur";

export default function HomePage() {
  const router = useRouter();
  const { currentUser, setCurrentUser } = useBudget();

  useEffect(() => {
    if (!currentUser) {
      router.replace("/");
    }
  }, [currentUser, router]);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(148,163,184,0.16),_transparent_36%),linear-gradient(180deg,_#f8fafc_0%,_#eef2f7_100%)] px-4 py-10 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <div className={`${surfaceClass} p-6 sm:p-8`}>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
            Budget Tracker
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
            Home
          </h1>
          {currentUser ? (
            <p className="mt-3 text-sm leading-6 text-slate-500">
              Signed in as {currentUser.username}
            </p>
          ) : null}
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Choose what you want to do next.
          </p>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <Link
              href="/setup"
              className="rounded-3xl border border-slate-200 bg-slate-50/70 px-5 py-5 text-center text-sm font-medium text-slate-900 transition hover:border-slate-300 hover:bg-white"
            >
              Set Income, Spending, and Savings
            </Link>
            <Link
              href="/transactions"
              className="rounded-3xl border border-slate-200 bg-slate-50/70 px-5 py-5 text-center text-sm font-medium text-slate-900 transition hover:border-slate-300 hover:bg-white"
            >
              Record Transaction
            </Link>
            <Link
              href="/spending"
              className="rounded-3xl border border-slate-200 bg-slate-50/70 px-5 py-5 text-center text-sm font-medium text-slate-900 transition hover:border-slate-300 hover:bg-white"
            >
              View Spending
            </Link>
          </div>

          <div className="mt-6 flex items-center gap-4 text-sm">
            <Link href="/settings" className="text-slate-500 transition hover:text-slate-900">
              Settings
            </Link>
            <button
              type="button"
              onClick={() => setCurrentUser(null)}
              className="text-slate-500 transition hover:text-slate-900"
            >
              Log Out
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
