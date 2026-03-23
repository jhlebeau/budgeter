"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useBudget } from "../budget-context";

type FormData = {
  amount: string;
  categoryId: string;
  date: string;
  note: string;
};

const emptyForm: FormData = {
  amount: "",
  categoryId: "",
  date: "",
  note: "",
};

export default function TransactionsPage() {
  const {
    categories,
    transactions,
    addTransaction,
    updateTransaction,
    deleteTransaction,
  } = useBudget();
  const [form, setForm] = useState<FormData>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormData>(emptyForm);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    await addTransaction({
      amount: Number(form.amount),
      categoryId: form.categoryId,
      date: form.date,
      note: form.note.trim(),
    });

    setForm(emptyForm);
  };

  const startEditing = (id: string) => {
    const transaction = transactions.find((item) => item.id === id);
    if (!transaction) return;

    setEditingId(id);
    setEditForm({
      amount: String(transaction.amount),
      categoryId: transaction.categoryId,
      date: transaction.date,
      note: transaction.note,
    });
  };

  const saveEdit = async () => {
    if (editingId === null) return;

    await updateTransaction(editingId, {
      amount: Number(editForm.amount),
      categoryId: editForm.categoryId,
      date: editForm.date,
      note: editForm.note.trim(),
    });

    setEditingId(null);
    setEditForm(emptyForm);
  };

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <Link href="/" className="mb-5 inline-block text-sm text-zinc-600 hover:underline">
        Back to Home
      </Link>
      <h1 className="mb-4 text-2xl font-semibold">Record Transaction</h1>

      <form onSubmit={onSubmit} className="space-y-3 rounded-lg border p-4">
        <select
          value={form.categoryId}
          onChange={(event) =>
            setForm((current) => ({ ...current, categoryId: event.target.value }))
          }
          className="w-full rounded border px-3 py-2"
          required
          disabled={categories.length === 0}
        >
          <option value="">
            {categories.length === 0
              ? "Create a category in set spending first"
              : "Select a category"}
          </option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
            $
          </span>
          <input
            type="number"
            step="0.01"
            placeholder="Amount"
            value={form.amount}
            onChange={(event) =>
              setForm((current) => ({ ...current, amount: event.target.value }))
            }
            className="w-full rounded border py-2 pr-3 pl-7"
            required
          />
        </div>
        <input
          type="date"
          value={form.date}
          onChange={(event) =>
            setForm((current) => ({ ...current, date: event.target.value }))
          }
          className="w-full rounded border px-3 py-2"
          required
        />
        <textarea
          placeholder="Description"
          value={form.note}
          onChange={(event) =>
            setForm((current) => ({ ...current, note: event.target.value }))
          }
          className="w-full rounded border px-3 py-2"
          rows={3}
        />
        <button
          type="submit"
          className="rounded bg-black px-4 py-2 text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
          disabled={categories.length === 0}
        >
          Add Transaction
        </button>
      </form>

      <section className="mt-6">
        <h2 className="mb-3 text-lg font-medium">Transactions</h2>
        <ul className="space-y-2">
          {transactions.map((transaction) => (
            <li
              key={transaction.id}
              className="rounded border px-3 py-2 text-sm leading-6"
            >
              {editingId === transaction.id ? (
                <div className="space-y-2">
                  <select
                    value={editForm.categoryId}
                    onChange={(event) =>
                      setEditForm((current) => ({
                        ...current,
                        categoryId: event.target.value,
                      }))
                    }
                    className="w-full rounded border px-3 py-2"
                    required
                  >
                    <option value="">Select a category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
                      $
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      value={editForm.amount}
                      onChange={(event) =>
                        setEditForm((current) => ({
                          ...current,
                          amount: event.target.value,
                        }))
                      }
                      className="w-full rounded border py-2 pr-3 pl-7"
                      required
                    />
                  </div>
                  <input
                    type="date"
                    value={editForm.date}
                    onChange={(event) =>
                      setEditForm((current) => ({
                        ...current,
                        date: event.target.value,
                      }))
                    }
                    className="w-full rounded border px-3 py-2"
                    required
                  />
                  <textarea
                    placeholder="Description"
                    value={editForm.note}
                    onChange={(event) =>
                      setEditForm((current) => ({
                        ...current,
                        note: event.target.value,
                      }))
                    }
                    className="w-full rounded border px-3 py-2"
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={saveEdit}
                      className="rounded bg-black px-3 py-1.5 text-white hover:bg-zinc-800"
                      disabled={!editForm.categoryId}
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(null);
                        setEditForm(emptyForm);
                      }}
                      className="rounded border px-3 py-1.5 hover:bg-zinc-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="font-medium">
                    ${transaction.amount.toFixed(2)} - {transaction.categoryName}
                  </p>
                  <p className="text-zinc-600">{transaction.date}</p>
                  {transaction.note ? <p>{transaction.note}</p> : null}
                  <button
                    type="button"
                    onClick={() => startEditing(transaction.id)}
                    className="mt-2 rounded border px-3 py-1.5 hover:bg-zinc-50"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const shouldDelete = window.confirm(
                        "Delete this transaction?",
                      );
                      if (!shouldDelete) return;
                      await deleteTransaction(transaction.id);
                    }}
                    className="mt-2 ml-2 rounded border px-3 py-1.5 text-red-600 hover:bg-zinc-50"
                  >
                    Delete
                  </button>
                </>
              )}
            </li>
          ))}
          {transactions.length === 0 ? (
            <li className="text-sm text-zinc-500">No transactions yet.</li>
          ) : null}
        </ul>
      </section>
    </main>
  );
}
