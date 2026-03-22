"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useBudget } from "../budget-context";

export default function CategoriesPage() {
  const { categories, addCategory } = useBudget();
  const [newCategory, setNewCategory] = useState("");

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (addCategory(newCategory)) {
      setNewCategory("");
    }
  };

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-10">
      <Link href="/" className="mb-5 inline-block text-sm text-zinc-600 hover:underline">
        Back to Home
      </Link>
      <h1 className="mb-4 text-2xl font-semibold">Create Spending Categories</h1>

      <form onSubmit={onSubmit} className="space-y-3 rounded-lg border p-4">
        <input
          type="text"
          placeholder="Category name"
          value={newCategory}
          onChange={(event) => setNewCategory(event.target.value)}
          className="w-full rounded border px-3 py-2"
          required
        />
        <button
          type="submit"
          className="rounded bg-black px-4 py-2 text-white hover:bg-zinc-800"
        >
          Add Category
        </button>
      </form>

      <section className="mt-6">
        <h2 className="mb-3 text-lg font-medium">Current Categories</h2>
        <ul className="space-y-2">
          {categories.map((category) => (
            <li key={category} className="rounded border px-3 py-2 text-sm">
              {category}
            </li>
          ))}
          {categories.length === 0 ? (
            <li className="text-sm text-zinc-500">No categories yet.</li>
          ) : null}
        </ul>
      </section>
    </main>
  );
}
