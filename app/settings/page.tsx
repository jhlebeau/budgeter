"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useBudget } from "../budget-context";

const inputClass =
  "w-full rounded-2xl border border-slate-600/40 bg-slate-950/90 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-rose-400/60 focus:ring-2 focus:ring-rose-400/20";

export default function SettingsPage() {
  const router = useRouter();
  const { resetData } = useBudget();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const onChangePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    setIsChangingPassword(true);
    try {
      const response = await fetch("/api/users/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (!response.ok) {
        const data = await response.json() as { error?: string };
        setPasswordError(data.error ?? "Unable to change password.");
        return;
      }

      setPasswordSuccess("Password changed successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,_#020617_0%,_#111827_100%)] px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <section className="rounded-[2rem] border border-rose-400/20 bg-slate-900/78 p-6 shadow-[0_30px_100px_-42px_rgba(190,24,93,0.4)] backdrop-blur-xl sm:p-8">
          <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
            <Link href="/home" className="text-rose-200 transition hover:text-white">
              Home
            </Link>
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-rose-200/70">
            Settings
          </p>
          <h1 className="mt-3 font-display text-5xl leading-none text-slate-50">
            Account settings
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">
            Manage the data stored in this account. Resetting data will permanently remove
            your income sources, spending categories, savings categories, and transactions.
          </p>
        </section>

        <section className="rounded-[2rem] border border-slate-700/40 bg-slate-900/60 p-6">
          <p className="text-sm font-semibold text-slate-200">Change password</p>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-400">
            Update your login password. You will need your current password to confirm.
          </p>
          <form onSubmit={onChangePassword} className="mt-6 flex max-w-sm flex-col gap-3">
            <input
              type="password"
              placeholder="Current password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className={inputClass}
              required
            />
            <input
              type="password"
              placeholder="New password (min. 8 characters)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={inputClass}
              minLength={8}
              maxLength={128}
              required
            />
            <input
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={inputClass}
              required
            />
            <button
              type="submit"
              disabled={isChangingPassword}
              className="inline-flex items-center justify-center rounded-2xl border border-slate-600/40 bg-slate-950/80 px-4 py-3 text-sm font-medium text-slate-200 transition hover:bg-slate-800/60 disabled:cursor-not-allowed"
            >
              Update Password
            </button>
            {passwordError ? (
              <p className="text-sm font-medium text-rose-300">{passwordError}</p>
            ) : null}
            {passwordSuccess ? (
              <p className="text-sm font-medium text-emerald-400">{passwordSuccess}</p>
            ) : null}
          </form>
        </section>

        <section className="rounded-[2rem] border border-rose-400/30 bg-rose-950/35 p-6 shadow-[0_18px_60px_-40px_rgba(225,29,72,0.45)]">
          <p className="text-sm font-semibold text-rose-200">Reset data</p>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-rose-100/85">
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
            className="mt-6 inline-flex items-center justify-center rounded-2xl border border-rose-400/35 bg-slate-950/80 px-4 py-3 text-sm font-medium text-rose-200 transition hover:bg-rose-950/60"
          >
            Reset Data
          </button>
        </section>
      </div>
    </main>
  );
}
