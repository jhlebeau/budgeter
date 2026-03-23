"use client";

import Link from "next/link";
import { useBudget } from "../budget-context";

export default function SettingsPage() {
  const { resetData } = useBudget();

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-10">
      <Link href="/" className="mb-5 inline-block text-sm text-zinc-600 hover:underline">
        Back to Home
      </Link>
      <h1 className="mb-4 text-2xl font-semibold">Settings</h1>
      <button
        type="button"
        onClick={async () => {
          const shouldReset = window.confirm(
            "Reset all data? This will delete all income sources, spending categories, and transactions.",
          );
          if (!shouldReset) return;
          await resetData();
        }}
        className="rounded border px-4 py-3 text-center font-medium hover:bg-zinc-50"
      >
        Reset Data
      </button>
    </main>
  );
}

