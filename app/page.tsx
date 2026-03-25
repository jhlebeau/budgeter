"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useBudget } from "./budget-context";

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
    <main className="mx-auto w-full max-w-md px-4 py-12">
      <h1 className="mb-2 text-3xl font-semibold">Budget Tracker</h1>
      <p className="mb-6 text-zinc-600">Log in with your username or create a new account.</p>

      <form onSubmit={onSubmit} className="space-y-3 rounded-lg border p-4">
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          className="w-full rounded border px-3 py-2"
          pattern="^[A-Za-z0-9]+$"
          title="Username must contain only letters and numbers."
          maxLength={32}
          required
        />
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded bg-black px-4 py-2 text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
          >
            Log In
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => router.push("/create-account")}
            className="rounded border px-4 py-2 hover:bg-zinc-50 disabled:cursor-not-allowed"
          >
            Create Account
          </button>
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </form>
    </main>
  );
}
