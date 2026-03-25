"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { AppUser, useBudget } from "../budget-context";

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
    <main className="mx-auto w-full max-w-md px-4 py-12">
      <Link href="/" className="mb-5 inline-block text-sm text-zinc-600 hover:underline">
        Back to Login
      </Link>
      <h1 className="mb-2 text-3xl font-semibold">Create Account</h1>
      <p className="mb-6 text-zinc-600">Choose an alphanumeric username.</p>

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
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded bg-black px-4 py-2 text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
        >
          Confirm
        </button>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </form>
    </main>
  );
}

