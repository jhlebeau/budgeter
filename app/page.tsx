import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-xl px-4 py-12">
      <h1 className="mb-6 text-3xl font-semibold">Budget Tracker</h1>
      <p className="mb-6 text-zinc-600">Choose what you want to do:</p>
      <div className="flex flex-col gap-3">
        <Link
          href="/categories"
          className="rounded border px-4 py-3 text-center font-medium hover:bg-zinc-50"
        >
          Create Spending Categories
        </Link>
        <Link
          href="/transactions"
          className="rounded border px-4 py-3 text-center font-medium hover:bg-zinc-50"
        >
          Record Transaction
        </Link>
        <Link
          href="/spending"
          className="rounded border px-4 py-3 text-center font-medium hover:bg-zinc-50"
        >
          View Spending
        </Link>
      </div>
    </main>
  );
}
