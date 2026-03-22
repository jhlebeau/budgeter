"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useBudget } from "../budget-context";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export default function CategoriesPage() {
  const {
    categories,
    addCategory,
    updateCategoryLimit,
    updateCategoryName,
    deleteCategory,
  } = useBudget();
  const [newCategory, setNewCategory] = useState("");
  const [newLimit, setNewLimit] = useState("");
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingLimit, setEditingLimit] = useState("");

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (addCategory(newCategory, Number(newLimit))) {
      setNewCategory("");
      setNewLimit("");
    }
  };

  const startLimitEdit = (name: string, monthlyLimit: number) => {
    setEditingCategory(name);
    setEditingName(name);
    setEditingLimit(String(monthlyLimit));
  };

  const saveLimitEdit = () => {
    if (!editingCategory) return;

    const didRename = updateCategoryName(editingCategory, editingName);
    const finalName = didRename ? editingName.trim() : editingCategory;
    updateCategoryLimit(finalName, Number(editingLimit));
    setEditingCategory(null);
    setEditingName("");
    setEditingLimit("");
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
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
            $
          </span>
          <input
            type="number"
            step="0.01"
            min="0.01"
            placeholder="Monthly spending limit"
            value={newLimit}
            onChange={(event) => setNewLimit(event.target.value)}
            className="w-full rounded border py-2 pr-3 pl-7"
            required
          />
        </div>
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
            <li key={category.name} className="rounded border px-3 py-2 text-sm">
              <p className="mb-2 font-medium">{category.name}</p>
              <p className="mb-2 text-zinc-600">
                Current limit: {currencyFormatter.format(category.monthlyLimit)}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                {editingCategory === category.name ? (
                  <>
                    <input
                      type="text"
                      value={editingName}
                      onChange={(event) => setEditingName(event.target.value)}
                      className="rounded border px-3 py-1.5"
                    />
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
                        $
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={editingLimit}
                        onChange={(event) => setEditingLimit(event.target.value)}
                        className="rounded py-1.5 pr-3 pl-7 border"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={saveLimitEdit}
                      className="rounded border px-3 py-1.5 hover:bg-zinc-50"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCategory(null);
                        setEditingName("");
                        setEditingLimit("");
                      }}
                      className="rounded border px-3 py-1.5 hover:bg-zinc-50"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      startLimitEdit(category.name, category.monthlyLimit)
                    }
                    className="rounded border px-3 py-1.5 hover:bg-zinc-50"
                  >
                    Update Category
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    const shouldDelete = window.confirm(
                      `Delete category "${category.name}"? This will also delete its transactions.`,
                    );
                    if (!shouldDelete) return;

                    deleteCategory(category.name);
                    if (editingCategory === category.name) {
                      setEditingCategory(null);
                      setEditingName("");
                      setEditingLimit("");
                    }
                  }}
                  className="rounded border px-3 py-1.5 text-red-600 hover:bg-zinc-50"
                >
                  Delete
                </button>
              </div>
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
