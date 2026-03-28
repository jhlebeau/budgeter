"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { AppUser, useBudget } from "../budget-context";

const inputClass =
  "w-full rounded-2xl border border-orange-400/25 bg-slate-950/90 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-orange-300 focus:ring-2 focus:ring-orange-400/25";

export default function CreateAccountPage() {
  const router = useRouter();
  const { setCurrentUser } = useBudget();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
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
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password.length > 128) {
      setError("Password must be 128 characters or fewer.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: trimmed, password }),
      });

      if (!response.ok) {
        if (response.status === 409) {
          setError("That username already exists. Try logging in.");
          return;
        }
        if (response.status === 400) {
          const data = await response.json() as { error?: string };
          setError(data.error ?? "Invalid username or password.");
          return;
        }
        setError("Unable to create account right now.");
        return;
      }

      const user = (await response.json()) as AppUser;
      setCurrentUser(user);
      router.push("/home");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,_#020617_0%,_#111827_100%)] px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-4xl items-center">
        <section className="grid w-full gap-6 rounded-[2rem] border border-orange-400/20 bg-slate-900/78 p-6 shadow-[0_30px_100px_-42px_rgba(194,65,12,0.45)] backdrop-blur-xl lg:grid-cols-[0.85fr_1.15fr] lg:p-8">
          <div className="rounded-[1.75rem] bg-[linear-gradient(160deg,_rgba(234,88,12,0.22)_0%,_rgba(251,146,60,0.16)_48%,_rgba(253,186,116,0.12)_100%)] p-6 text-white border border-orange-400/20">
            <Link href="/" className="text-sm font-medium text-orange-100/80 transition hover:text-white">
              Back to Login
            </Link>
            <h1 className="mt-8 font-display text-4xl leading-none text-slate-50">Create your workspace</h1>
            <p className="mt-4 text-sm leading-7 text-slate-200">
              Set up an account to get started today.
            </p>
          </div>

          <div className="flex flex-col justify-center">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-orange-200/70">
              New Account
            </p>
            <h2 className="mt-3 font-display text-4xl leading-none text-slate-50">
              Create account
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Choose a username and password to get started.
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
                placeholder="Password (min. 8 characters)"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className={inputClass}
                minLength={8}
                maxLength={128}
                required
              />
              <input
                type="password"
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className={inputClass}
                required
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center justify-center rounded-2xl bg-orange-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-orange-200 disabled:cursor-not-allowed disabled:bg-orange-900 disabled:text-orange-100"
              >
                Create Account
              </button>
              {error ? <p className="text-sm font-medium text-rose-300">{error}</p> : null}
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
