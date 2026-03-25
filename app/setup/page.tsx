import Link from "next/link";

const surfaceClass =
  "rounded-3xl border border-slate-200/80 bg-white/90 shadow-[0_18px_60px_-32px_rgba(15,23,42,0.35)] backdrop-blur";

export default function SetupPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(148,163,184,0.16),_transparent_36%),linear-gradient(180deg,_#f8fafc_0%,_#eef2f7_100%)] px-4 py-10 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <div className={`${surfaceClass} p-6 sm:p-8`}>
          <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
            <Link href="/home" className="text-slate-500 transition hover:text-slate-900">
              Home
            </Link>
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
            Setup
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
            Set income, spending, and savings
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            Pick the area you want to configure.
          </p>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <Link
              href="/income"
              className="rounded-3xl border border-slate-200 bg-slate-50/70 px-5 py-5 text-center text-sm font-medium text-slate-900 transition hover:border-slate-300 hover:bg-white"
            >
              Add Income
            </Link>
            <Link
              href="/categories"
              className="rounded-3xl border border-slate-200 bg-slate-50/70 px-5 py-5 text-center text-sm font-medium text-slate-900 transition hover:border-slate-300 hover:bg-white"
            >
              Create Spending Categories
            </Link>
            <Link
              href="/savings-categories"
              className="rounded-3xl border border-slate-200 bg-slate-50/70 px-5 py-5 text-center text-sm font-medium text-slate-900 transition hover:border-slate-300 hover:bg-white"
            >
              Create Savings Categories
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
