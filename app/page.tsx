"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useBudget } from "./budget-context";

const inputClass =
  "w-full rounded-2xl border border-cyan-200/80 bg-white/90 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-200";

export default function LoginPage() {
  const router = useRouter();
  const { currentUser, setCurrentUser } = useBudget();
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (currentUser) {
      router.replace("/home");
    }
  }, [currentUser, router]);

  const submit = async () => {
    setError("");
    const trimmed = username.trim();
    if (!trimmed) {
      setError("Please enter a username.");
      return;
    }
    if (!/^[A-Za-z0-9]+$/.test(trimmed)) {
      setError("Username must be alphanumeric only.");
      return;
    }
    if (trimmed.length > 32) {
      setError("Username must be 32 characters or fewer.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/users?username=${encodeURIComponent(trimmed)}`);

      if (!response.ok) {
        if (response.status === 404) {
          setError("User not found. Create a new account first.");
          return;
        }
        setError("Unable to continue right now.");
        return;
      }

      const user = await response.json();
      setCurrentUser(user);
      router.push("/home");
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void submit();
  };

  return (
    <main className="min-h-screen overflow-hidden bg-[linear-gradient(135deg,_#ecfeff_0%,_#f0f9ff_38%,_#fff7ed_100%)] px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-slate-950 px-6 py-8 text-white shadow-[0_32px_100px_-40px_rgba(8,47,73,0.8)] sm:px-8 sm:py-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(103,232,249,0.34),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(251,146,60,0.26),_transparent_30%)]" />
          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-cyan-100/80">
              Budget Tracker
            </p>
            <h1 className="mt-6 max-w-lg font-display text-5xl leading-none sm:text-6xl">
              Brighter money planning, without the noise.
            </h1>
            <p className="mt-5 max-w-xl text-sm leading-7 text-slate-200 sm:text-base">
              The budgeting tools stay practical, but the experience no longer has to feel
              flat. Sign in to pick up where you left off.
            </p>
            <div className="mt-10 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
                <p className="text-xs uppercase tracking-[0.24em] text-cyan-100/70">Income</p>
                <p className="mt-2 text-sm text-slate-100">Cleaner planning dashboards</p>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
                <p className="text-xs uppercase tracking-[0.24em] text-orange-100/70">Setup</p>
                <p className="mt-2 text-sm text-slate-100">Sharper paths through each task</p>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
                <p className="text-xs uppercase tracking-[0.24em] text-sky-100/70">Reports</p>
                <p className="mt-2 text-sm text-slate-100">More expressive monthly snapshots</p>
              </div>
            </div>
          </div>
        </section>

        <section className="relative rounded-[2rem] border border-cyan-100/80 bg-white/82 p-6 shadow-[0_32px_100px_-40px_rgba(14,116,144,0.45)] backdrop-blur-xl sm:p-8">
          <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300 to-transparent" />
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-700/60">
            Welcome Back
          </p>
          <h2 className="mt-3 font-display text-4xl leading-none text-slate-950">Log in</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Continue with your username or create a new account.
          </p>

          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className={inputClass}
              pattern="^[A-Za-z0-9]+$"
              title="Username must contain only letters and numbers."
              maxLength={32}
              required
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center justify-center rounded-2xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:bg-cyan-300"
              >
                Log In
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => router.push("/create-account")}
                className="inline-flex items-center justify-center rounded-2xl border border-orange-200 bg-orange-50/70 px-4 py-3 text-sm font-medium text-orange-950 transition hover:bg-orange-100 disabled:cursor-not-allowed"
              >
                Create Account
              </button>
            </div>
            {error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}
          </form>
        </section>
      </div>
    </main>
  );
}
