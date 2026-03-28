"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useBudget } from "./budget-context";

const inputClass =
  "w-full rounded-2xl border border-cyan-400/25 bg-slate-950/90 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-400/25";

export default function LoginPage() {
  const router = useRouter();
  const { currentUser, setCurrentUser } = useBudget();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
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
    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: trimmed, password }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          setError("Incorrect username or password.");
          return;
        }
        setError("Unable to log in right now.");
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
    <main className="min-h-screen overflow-hidden bg-[linear-gradient(135deg,_#020617_0%,_#0f172a_48%,_#111827_100%)] px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="relative overflow-hidden rounded-[2rem] border border-cyan-400/20 bg-slate-950/70 px-6 py-8 text-white shadow-[0_32px_100px_-40px_rgba(8,47,73,0.9)] sm:px-8 sm:py-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(103,232,249,0.22),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(251,146,60,0.18),_transparent_30%)]" />
          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-cyan-200/80">
              Budget Tracker
            </p>
            <h1 className="mt-6 max-w-lg font-display text-5xl leading-none text-slate-50 sm:text-6xl">
              Take control of your money, month by month.
            </h1>
            <p className="mt-5 max-w-xl text-sm leading-7 text-slate-200 sm:text-base">
              Track income, manage spending, and see how each month stacks up against your
              goals.
            </p>
          </div>
        </section>

        <section className="relative rounded-[2rem] border border-cyan-400/20 bg-slate-900/78 p-6 shadow-[0_32px_100px_-40px_rgba(14,116,144,0.45)] backdrop-blur-xl sm:p-8">
          <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/80 to-transparent" />
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200/75">
            Welcome Back
          </p>
          <h2 className="mt-3 font-display text-4xl leading-none text-slate-50">Log in</h2>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            Continue with your username and password or create a new account.
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
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className={inputClass}
              required
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center justify-center rounded-2xl bg-cyan-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:bg-cyan-900 disabled:text-cyan-100"
              >
                Log In
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => router.push("/create-account")}
                className="inline-flex items-center justify-center rounded-2xl border border-orange-400/25 bg-slate-950/80 px-4 py-3 text-sm font-medium text-orange-200 transition hover:bg-orange-950/40 disabled:cursor-not-allowed"
              >
                Create Account
              </button>
            </div>
            {error ? <p className="text-sm font-medium text-rose-300">{error}</p> : null}
          </form>
        </section>
      </div>
    </main>
  );
}
