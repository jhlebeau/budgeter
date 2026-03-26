"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { AppUser, useBudget } from "../budget-context";

const surfaceClass =
  "rounded-3xl border border-slate-200/80 bg-white/90 shadow-[0_18px_60px_-32px_rgba(15,23,42,0.35)] backdrop-blur";
const inputClass =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200";

export default function CreateAccountPage() {
  const router = useRouter();
  const { setCurrentUser } = useBudget();
  const [username, setUsername] = useState("");
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

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: trimmed }),
      });

      if (!response.ok) {
        if (response.status === 409) {
          setError("That username already exists. Try logging in.");
          return;
        }
        if (response.status === 400) {
          setError("Username must be alphanumeric and 32 characters or fewer.");
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
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(148,163,184,0.16),_transparent_36%),linear-gradient(180deg,_#f8fafc_0%,_#eef2f7_100%)] px-4 py-10 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        <div className={`${surfaceClass} p-6 sm:p-8`}>
          <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
            <Link href="/" className="text-slate-500 transition hover:text-slate-900">
              Back to Login
            </Link>
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
            Budget Tracker
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
            Create account
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            Choose an alphanumeric username to start a new account.
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
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
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              Confirm
            </button>
            {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}
          </form>
        </div>
      </div>
    </main>
  );
}
