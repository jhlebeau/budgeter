"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useBudget } from "../budget-context";

export default function SettingsPage() {
  const router = useRouter();
  const { resetData } = useBudget();

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(244,114,182,0.16),_transparent_24%),radial-gradient(circle_at_bottom_right,_rgba(251,146,60,0.16),_transparent_26%),linear-gradient(180deg,_#fff7fb_0%,_#fff7ed_100%)] px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <section className="rounded-[2rem] border border-rose-100/80 bg-white/82 p-6 shadow-[0_30px_100px_-42px_rgba(190,24,93,0.3)] backdrop-blur-xl sm:p-8">
          <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
            <Link href="/home" className="text-rose-800/70 transition hover:text-rose-950">
              Home
            </Link>
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-rose-700/60">
            Settings
          </p>
          <h1 className="mt-3 font-display text-5xl leading-none text-slate-950">
            Account settings
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">
            Manage the data stored in this account. Resetting data will permanently remove
            your income sources, spending categories, savings categories, and transactions.
          </p>
        </section>

        <section className="rounded-[2rem] border border-rose-200/80 bg-rose-50/80 p-6 shadow-[0_18px_60px_-40px_rgba(225,29,72,0.35)]">
          <p className="text-sm font-semibold text-rose-700">Reset data</p>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-rose-900/75">
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
            className="mt-6 inline-flex items-center justify-center rounded-2xl border border-rose-300 bg-white px-4 py-3 text-sm font-medium text-rose-700 transition hover:bg-rose-100"
          >
            Reset Data
          </button>
        </section>
      </div>
    </main>
  );
}
