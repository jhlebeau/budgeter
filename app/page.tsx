"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useBudget } from "./budget-context";

const surfaceClass =
  "rounded-3xl border border-slate-200/80 bg-white/90 shadow-[0_18px_60px_-32px_rgba(15,23,42,0.35)] backdrop-blur";
const inputClass =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200";

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
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(148,163,184,0.16),_transparent_36%),linear-gradient(180deg,_#f8fafc_0%,_#eef2f7_100%)] px-4 py-10 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        <div className={`${surfaceClass} p-6 sm:p-8`}>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
            Budget Tracker
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
            Log in
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            Continue with your username or create a new account.
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
            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                Log In
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => router.push("/create-account")}
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed"
              >
                Create Account
              </button>
            </div>
            {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}
          </form>
        </div>
      </div>
    </main>
  );
}
