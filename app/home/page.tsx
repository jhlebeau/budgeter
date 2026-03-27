"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useBudget } from "../budget-context";

const actions = [
  {
    href: "/setup",
    title: "Set Income, Spending, and Savings",
    description: "Tune the foundation of your plan.",
    accent: "from-cyan-500/20 to-sky-500/10",
  },
  {
    href: "/transactions",
    title: "Record Transaction",
    description: "Keep daily spending current.",
    accent: "from-violet-500/20 to-fuchsia-500/10",
  },
  {
    href: "/spending",
    title: "View Spending",
    description: "Check monthly performance in color.",
    accent: "from-rose-500/20 to-orange-500/10",
  },
];

export default function HomePage() {
  const router = useRouter();
  const { currentUser, setCurrentUser } = useBudget();

  useEffect(() => {
    if (!currentUser) {
      router.replace("/");
    }
  }, [currentUser, router]);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(34,197,94,0.18),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(56,189,248,0.16),_transparent_26%),linear-gradient(180deg,_#f0fdf4_0%,_#eff6ff_45%,_#f8fafc_100%)] px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <section className="overflow-hidden rounded-[2rem] border border-emerald-100/80 bg-white/82 shadow-[0_30px_100px_-42px_rgba(22,101,52,0.35)] backdrop-blur-xl">
          <div className="grid gap-6 p-6 lg:grid-cols-[1.1fr_0.9fr] lg:p-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-700/60">
                Budget Tracker
              </p>
              <h1 className="mt-4 font-display text-5xl leading-none text-slate-950">
                Your budget hub just got a little more alive.
              </h1>
              {currentUser ? (
                <p className="mt-5 text-sm leading-7 text-slate-600">
                  Signed in as <span className="font-semibold text-slate-900">{currentUser.username}</span>
                </p>
              ) : null}
              <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
                Choose what you want to do next. The planning pages stay consistent, while
                each area now has a bit more personality.
              </p>
            </div>
            <div className="rounded-[1.75rem] bg-slate-950 p-6 text-white">
              <p className="text-xs uppercase tracking-[0.24em] text-emerald-200/70">Quick Access</p>
              <div className="mt-5 flex flex-wrap gap-3 text-sm">
                <Link href="/settings" className="rounded-full border border-white/15 px-4 py-2 text-white/85 transition hover:bg-white/10">
                  Settings
                </Link>
                <button
                  type="button"
                  onClick={() => setCurrentUser(null)}
                  className="rounded-full border border-white/15 px-4 py-2 text-white/85 transition hover:bg-white/10"
                >
                  Log Out
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          {actions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className={`group overflow-hidden rounded-[1.75rem] border border-white/70 bg-gradient-to-br ${action.accent} from-0% p-[1px] shadow-[0_24px_70px_-44px_rgba(15,23,42,0.4)] transition hover:-translate-y-1`}
            >
              <div className="h-full rounded-[calc(1.75rem-1px)] bg-white/88 p-6 backdrop-blur-xl">
                <p className="text-lg font-semibold text-slate-950">{action.title}</p>
                <p className="mt-3 text-sm leading-6 text-slate-600">{action.description}</p>
                <p className="mt-8 text-sm font-medium text-slate-700 transition group-hover:text-slate-950">
                  Open page
                </p>
              </div>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}
