import { ReactNode } from "react";

export type DashboardTheme = {
  page: string;
  surface: string;
  card: string;
  input: string;
  subtleButton: string;
  primaryButton: string;
  breadcrumb: string;
  eyebrow: string;
  heading: string;
  body: string;
  label: string;
  hint: string;
  metricLabel: string;
  pill: string;
  emptyState: string;
  dangerCard?: string;
  dangerButton?: string;
};

type SectionCardProps = {
  theme: DashboardTheme;
  eyebrow: string;
  title: string;
  description?: string;
  children: ReactNode;
};

type FieldLabelProps = {
  theme: DashboardTheme;
  label: string;
  hint?: string;
};

type MetricCardProps = {
  theme: DashboardTheme;
  label: string;
  value: string;
  detail: string;
};

export function DashboardSectionCard({
  theme,
  eyebrow,
  title,
  description,
  children,
}: SectionCardProps) {
  return (
    <section className={`${theme.surface} p-6 sm:p-7`}>
      <div className="mb-6">
        <p className={`text-xs font-semibold uppercase tracking-[0.24em] ${theme.eyebrow}`}>
          {eyebrow}
        </p>
        <h2 className={`mt-2 text-xl font-semibold ${theme.heading}`}>{title}</h2>
        {description ? (
          <p className={`mt-2 max-w-2xl text-sm leading-6 ${theme.body}`}>{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export function DashboardFieldLabel({ theme, label, hint }: FieldLabelProps) {
  return (
    <div className="mb-2 flex items-center justify-between gap-3">
      <label className={`text-sm font-medium ${theme.label}`}>{label}</label>
      {hint ? <span className={`text-xs ${theme.hint}`}>{hint}</span> : null}
    </div>
  );
}

export function DashboardMetricCard({
  theme,
  label,
  value,
  detail,
}: MetricCardProps) {
  return (
    <div className={`${theme.surface} p-5`}>
      <p className={`text-sm font-medium ${theme.metricLabel}`}>{label}</p>
      <p className={`mt-3 text-2xl font-semibold tracking-tight ${theme.heading}`}>{value}</p>
      <p className={`mt-2 text-sm ${theme.body}`}>{detail}</p>
    </div>
  );
}

const sharedSurface =
  "rounded-[2rem] border shadow-[0_24px_80px_-36px_rgba(15,23,42,0.4)] backdrop-blur-xl";
const sharedCard = "rounded-2xl border px-4 py-4";
const sharedInput =
  "w-full rounded-2xl border px-4 py-3 text-sm outline-none transition placeholder:text-slate-400";
const sharedButton = "inline-flex items-center justify-center rounded-2xl px-4 py-2.5 text-sm transition";

export const incomeTheme: DashboardTheme = {
  page: "min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.18),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(34,197,94,0.16),_transparent_24%),linear-gradient(180deg,_#f0f9ff_0%,_#ecfeff_48%,_#f8fafc_100%)] px-4 py-8 text-slate-900 sm:px-6 lg:px-8",
  surface: `${sharedSurface} border-sky-200/70 bg-white/78`,
  card: `${sharedCard} border-sky-100 bg-sky-50/80`,
  input: `${sharedInput} border-sky-200 bg-white/90 text-slate-900 focus:border-sky-400 focus:ring-2 focus:ring-sky-200`,
  subtleButton: `${sharedButton} border border-sky-200 bg-white/90 font-medium text-sky-900 hover:border-sky-300 hover:bg-sky-50`,
  primaryButton: `${sharedButton} bg-sky-950 font-semibold text-white hover:bg-sky-900 disabled:cursor-not-allowed disabled:bg-sky-300`,
  breadcrumb: "text-sky-800/70 transition hover:text-sky-950",
  eyebrow: "text-sky-700/55",
  heading: "text-slate-950",
  body: "text-slate-600",
  label: "text-slate-700",
  hint: "text-sky-700/50",
  metricLabel: "text-slate-600",
  pill: "rounded-full bg-sky-100 px-3 py-1 text-xs font-medium text-sky-900",
  emptyState: "rounded-3xl border border-dashed border-sky-200 bg-sky-50/75 p-8 text-center text-sm text-slate-600",
};

export const categoriesTheme: DashboardTheme = {
  page: "min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.20),_transparent_25%),radial-gradient(circle_at_bottom_right,_rgba(14,165,233,0.12),_transparent_24%),linear-gradient(180deg,_#fffdf5_0%,_#fff7ed_45%,_#f8fafc_100%)] px-4 py-8 text-slate-900 sm:px-6 lg:px-8",
  surface: `${sharedSurface} border-amber-200/70 bg-white/82`,
  card: `${sharedCard} border-amber-100 bg-amber-50/80`,
  input: `${sharedInput} border-amber-200 bg-white/90 text-slate-900 focus:border-amber-400 focus:ring-2 focus:ring-amber-200`,
  subtleButton: `${sharedButton} border border-amber-200 bg-white/90 font-medium text-amber-950 hover:border-amber-300 hover:bg-amber-50`,
  primaryButton: `${sharedButton} bg-amber-600 font-semibold text-white hover:bg-amber-500 disabled:cursor-not-allowed disabled:bg-amber-300`,
  breadcrumb: "text-amber-800/70 transition hover:text-amber-950",
  eyebrow: "text-amber-700/60",
  heading: "text-slate-950",
  body: "text-slate-600",
  label: "text-slate-700",
  hint: "text-amber-700/50",
  metricLabel: "text-slate-600",
  pill: "rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-900",
  emptyState: "rounded-3xl border border-dashed border-amber-200 bg-amber-50/75 p-8 text-center text-sm text-slate-600",
};

export const savingsTheme: DashboardTheme = {
  page: "min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.17),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(59,130,246,0.12),_transparent_24%),linear-gradient(180deg,_#ecfdf5_0%,_#f0fdf4_45%,_#f8fafc_100%)] px-4 py-8 text-slate-900 sm:px-6 lg:px-8",
  surface: `${sharedSurface} border-emerald-200/70 bg-white/82`,
  card: `${sharedCard} border-emerald-100 bg-emerald-50/80`,
  input: `${sharedInput} border-emerald-200 bg-white/90 text-slate-900 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200`,
  subtleButton: `${sharedButton} border border-emerald-200 bg-white/90 font-medium text-emerald-950 hover:border-emerald-300 hover:bg-emerald-50`,
  primaryButton: `${sharedButton} bg-emerald-700 font-semibold text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-emerald-300`,
  breadcrumb: "text-emerald-800/70 transition hover:text-emerald-950",
  eyebrow: "text-emerald-700/60",
  heading: "text-slate-950",
  body: "text-slate-600",
  label: "text-slate-700",
  hint: "text-emerald-700/50",
  metricLabel: "text-slate-600",
  pill: "rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-900",
  emptyState: "rounded-3xl border border-dashed border-emerald-200 bg-emerald-50/75 p-8 text-center text-sm text-slate-600",
};

export const transactionsTheme: DashboardTheme = {
  page: "min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(168,85,247,0.16),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(56,189,248,0.12),_transparent_24%),linear-gradient(180deg,_#faf5ff_0%,_#f5f3ff_42%,_#f8fafc_100%)] px-4 py-8 text-slate-900 sm:px-6 lg:px-8",
  surface: `${sharedSurface} border-violet-200/70 bg-white/82`,
  card: `${sharedCard} border-violet-100 bg-violet-50/80`,
  input: `${sharedInput} border-violet-200 bg-white/90 text-slate-900 focus:border-violet-400 focus:ring-2 focus:ring-violet-200`,
  subtleButton: `${sharedButton} border border-violet-200 bg-white/90 font-medium text-violet-950 hover:border-violet-300 hover:bg-violet-50`,
  primaryButton: `${sharedButton} bg-violet-700 font-semibold text-white hover:bg-violet-600 disabled:cursor-not-allowed disabled:bg-violet-300`,
  breadcrumb: "text-violet-800/70 transition hover:text-violet-950",
  eyebrow: "text-violet-700/60",
  heading: "text-slate-950",
  body: "text-slate-600",
  label: "text-slate-700",
  hint: "text-violet-700/50",
  metricLabel: "text-slate-600",
  pill: "rounded-full bg-violet-100 px-3 py-1 text-xs font-medium text-violet-900",
  emptyState: "rounded-3xl border border-dashed border-violet-200 bg-violet-50/75 p-8 text-center text-sm text-slate-600",
};

export const reportsTheme: DashboardTheme = {
  page: "min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(244,114,182,0.14),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(14,165,233,0.12),_transparent_24%),linear-gradient(180deg,_#fff7fb_0%,_#fdf2f8_40%,_#f8fafc_100%)] px-4 py-8 text-slate-900 sm:px-6 lg:px-8",
  surface: `${sharedSurface} border-rose-200/70 bg-white/82`,
  card: `${sharedCard} border-rose-100 bg-rose-50/80`,
  input: `${sharedInput} border-rose-200 bg-white/90 text-slate-900 focus:border-rose-400 focus:ring-2 focus:ring-rose-200`,
  subtleButton: `${sharedButton} border border-rose-200 bg-white/90 font-medium text-rose-950 hover:border-rose-300 hover:bg-rose-50`,
  primaryButton: `${sharedButton} bg-rose-700 font-semibold text-white hover:bg-rose-600 disabled:cursor-not-allowed disabled:bg-rose-300`,
  breadcrumb: "text-rose-800/70 transition hover:text-rose-950",
  eyebrow: "text-rose-700/60",
  heading: "text-slate-950",
  body: "text-slate-600",
  label: "text-slate-700",
  hint: "text-rose-700/50",
  metricLabel: "text-slate-600",
  pill: "rounded-full bg-rose-100 px-3 py-1 text-xs font-medium text-rose-900",
  emptyState: "rounded-3xl border border-dashed border-rose-200 bg-rose-50/75 p-8 text-center text-sm text-slate-600",
  dangerCard: "rounded-3xl border border-rose-200/80 bg-rose-50/80 p-5",
  dangerButton:
    "inline-flex items-center justify-center rounded-2xl border border-rose-300 bg-white px-4 py-2.5 text-sm font-medium text-rose-700 transition hover:bg-rose-50",
};
