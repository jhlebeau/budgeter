"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { AppUser, useBudget } from "../budget-context";

const inputClass =
  "w-full rounded-2xl border border-orange-200/80 bg-white/90 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-2 focus:ring-orange-200";

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
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(251,146,60,0.16),_transparent_26%),radial-gradient(circle_at_bottom_right,_rgba(56,189,248,0.14),_transparent_28%),linear-gradient(180deg,_#fff7ed_0%,_#fffbeb_45%,_#f8fafc_100%)] px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-4xl items-center">
        <section className="grid w-full gap-6 rounded-[2rem] border border-orange-100/80 bg-white/82 p-6 shadow-[0_30px_100px_-42px_rgba(194,65,12,0.4)] backdrop-blur-xl lg:grid-cols-[0.85fr_1.15fr] lg:p-8">
          <div className="rounded-[1.75rem] bg-[linear-gradient(160deg,_#ea580c_0%,_#fb923c_48%,_#fdba74_100%)] p-6 text-white">
            <Link href="/" className="text-sm font-medium text-white/80 transition hover:text-white">
              Back to Login
            </Link>
            <h1 className="mt-8 font-display text-4xl leading-none">Create a brighter workspace</h1>
            <p className="mt-4 text-sm leading-7 text-orange-50">
              Set up an account and jump straight into the refreshed budget flow.
            </p>
          </div>

          <div className="flex flex-col justify-center">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-orange-700/60">
              New Account
            </p>
            <h2 className="mt-3 font-display text-4xl leading-none text-slate-950">
              Pick a username
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Choose an alphanumeric username to start a new account.
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
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center justify-center rounded-2xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:bg-orange-300"
              >
                Confirm
              </button>
              {error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
