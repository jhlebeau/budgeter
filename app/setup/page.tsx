import Link from "next/link";

const setupLinks = [
  { href: "/income", title: "Add Income", description: "Capture salary, side gigs, and tax handling.", color: "border-sky-400/25" },
  { href: "/categories", title: "Create Spending Categories", description: "Shape how income gets allocated each month.", color: "border-amber-400/25" },
  { href: "/savings-categories", title: "Create Savings Categories", description: "Turn goals into a calmer monthly target.", color: "border-emerald-400/25" },
];

export default function SetupPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,_#020617_0%,_#0f172a_100%)] px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <section className="rounded-[2rem] border border-sky-400/20 bg-slate-900/78 p-6 shadow-[0_30px_100px_-42px_rgba(14,116,144,0.45)] backdrop-blur-xl sm:p-8">
          <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
            <Link href="/home" className="text-sky-200 transition hover:text-white">
              Home
            </Link>
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-200/70">
            Setup
          </p>
          <h1 className="mt-3 font-display text-5xl leading-none text-slate-50">
            Build the foundation.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">
            Add income sources, define spending categories, or set savings goals to build
            the core pieces of your monthly plan.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {setupLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-[1.75rem] border ${item.color} bg-slate-900/78 p-6 shadow-[0_18px_60px_-40px_rgba(2,6,23,0.8)] transition hover:-translate-y-1 hover:bg-slate-900`}
            >
              <p className="text-lg font-semibold text-slate-50">{item.title}</p>
              <p className="mt-3 text-sm leading-6 text-slate-300">{item.description}</p>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}
