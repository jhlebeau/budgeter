"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useBudget } from "../budget-context";

const surfaceClass =
  "rounded-3xl border border-slate-200/80 bg-white/90 shadow-[0_18px_60px_-32px_rgba(15,23,42,0.35)] backdrop-blur";

export default function SettingsPage() {
  const router = useRouter();
  const { resetData } = useBudget();

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
            Settings
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
            Account settings
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            Manage the data stored in this account. Resetting data will permanently remove
            your income sources, spending categories, savings categories, and transactions.
          </p>

          <div className="mt-6 rounded-3xl border border-red-200 bg-red-50/70 p-5">
            <p className="text-sm font-semibold text-red-700">Reset data</p>
            <p className="mt-2 text-sm leading-6 text-red-700/90">
              Use this if you want to start over from a clean slate. This action cannot be
              undone, and it will clear the budgeting setup and transaction history for the
              current account.
            </p>
            <button
              type="button"
              onClick={async () => {
                const shouldReset = window.confirm(
                  "Reset your data? This will delete your income sources, spending categories, savings categories, and transactions.",
                );
                if (!shouldReset) return;
                await resetData();
                router.push("/home");
              }}
              className="mt-4 inline-flex items-center justify-center rounded-2xl border border-red-300 bg-white px-4 py-2.5 text-sm font-medium text-red-700 transition hover:bg-red-50"
            >
              Reset Data
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
