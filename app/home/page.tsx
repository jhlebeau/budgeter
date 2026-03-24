"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useBudget } from "../budget-context";

export default function HomePage() {
  const router = useRouter();
  const { currentUser, setCurrentUser } = useBudget();

  useEffect(() => {
    if (!currentUser) {
      router.replace("/");
    }
  }, [currentUser, router]);

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-12">
      <h1 className="mb-2 text-3xl font-semibold">Budget Tracker</h1>
      {currentUser ? (
        <p className="mb-6 text-zinc-600">Signed in as {currentUser.username}</p>
      ) : null}
      <p className="mb-6 text-zinc-600">Choose what you want to do:</p>
      <div className="flex flex-col gap-3">
        <Link
          href="/setup"
          className="rounded border px-4 py-3 text-center font-medium hover:bg-zinc-50"
        >
          Set Income, Spending, and Savings
        </Link>
        <Link
          href="/transactions"
          className="rounded border px-4 py-3 text-center font-medium hover:bg-zinc-50"
        >
          Record Transaction
        </Link>
        <Link
          href="/spending"
          className="rounded border px-4 py-3 text-center font-medium hover:bg-zinc-50"
        >
          View Spending
        </Link>
      </div>
      <div className="mt-5 flex items-center gap-4 text-sm">
        <Link href="/settings" className="text-zinc-600 hover:underline">
          Settings
        </Link>
        <button
          type="button"
          onClick={() => setCurrentUser(null)}
          className="text-zinc-600 hover:underline"
        >
          Log Out
        </button>
      </div>
    </main>
  );
}
