import Link from "next/link";

export default function SetupPage() {
  return (
    <main className="mx-auto w-full max-w-xl px-4 py-10">
      <Link href="/" className="mb-5 inline-block text-sm text-zinc-600 hover:underline">
        Back to Home
      </Link>
      <h1 className="mb-4 text-2xl font-semibold">Set Income, Spending, and Savings</h1>
      <div className="flex flex-col gap-3">
        <Link
          href="/income"
          className="rounded border px-4 py-3 text-center font-medium hover:bg-zinc-50"
        >
          Add Income
        </Link>
        <Link
          href="/categories"
          className="rounded border px-4 py-3 text-center font-medium hover:bg-zinc-50"
        >
          Create Spending Categories
        </Link>
        <Link
          href="/savings-categories"
          className="rounded border px-4 py-3 text-center font-medium hover:bg-zinc-50"
        >
          Create Savings Categories
        </Link>
      </div>
    </main>
  );
}
