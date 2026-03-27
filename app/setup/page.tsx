import Link from "next/link";

const setupLinks = [
  {
    href: "/income",
    title: "Add Income",
    description: "Capture salary, side gigs, and tax handling.",
    color: "border-sky-200 bg-sky-50/75",
  },
  {
    href: "/categories",
    title: "Create Spending Categories",
    description: "Shape how income gets allocated each month.",
    color: "border-amber-200 bg-amber-50/75",
  },
  {
    href: "/savings-categories",
    title: "Create Savings Categories",
    description: "Turn goals into a calmer monthly target.",
    color: "border-emerald-200 bg-emerald-50/75",
  },
];

export default function SetupPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.16),_transparent_26%),radial-gradient(circle_at_bottom_right,_rgba(250,204,21,0.14),_transparent_24%),linear-gradient(180deg,_#f0f9ff_0%,_#fffdf5_100%)] px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <section className="rounded-[2rem] border border-sky-100/80 bg-white/80 p-6 shadow-[0_30px_100px_-42px_rgba(14,116,144,0.35)] backdrop-blur-xl sm:p-8">
          <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
            <Link href="/home" className="text-sky-800/70 transition hover:text-sky-950">
              Home
            </Link>
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700/60">
            Setup
          </p>
          <h1 className="mt-3 font-display text-5xl leading-none text-slate-950">
            Build the foundation.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">
            Pick the area you want to configure. Each track keeps the same workflow, but
            now the journey feels a little more distinct.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {setupLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-[1.75rem] border ${item.color} p-6 shadow-[0_18px_60px_-40px_rgba(15,23,42,0.3)] transition hover:-translate-y-1 hover:bg-white`}
            >
              <p className="text-lg font-semibold text-slate-950">{item.title}</p>
              <p className="mt-3 text-sm leading-6 text-slate-600">{item.description}</p>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}
