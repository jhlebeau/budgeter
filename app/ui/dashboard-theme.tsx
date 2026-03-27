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
  "rounded-[2rem] border shadow-[0_24px_80px_-36px_rgba(2,6,23,0.75)] backdrop-blur-xl";
const sharedCard = "rounded-2xl border px-4 py-4";
const sharedInput =
  "w-full rounded-2xl border px-4 py-3 text-sm outline-none transition placeholder:text-slate-500";
const sharedButton = "inline-flex items-center justify-center rounded-2xl px-4 py-2.5 text-sm transition";

const buildTheme = (accent: {
  glowA: string;
  glowB: string;
  border: string;
  cardBorder: string;
  ring: string;
  tint: string;
  text: string;
}) => ({
  page: `min-h-screen bg-[radial-gradient(circle_at_top_left,${accent.glowA},transparent_26%),radial-gradient(circle_at_bottom_right,${accent.glowB},transparent_22%),linear-gradient(180deg,_#020617_0%,_#0f172a_52%,_#111827_100%)] px-4 py-8 text-slate-100 sm:px-6 lg:px-8`,
  surface: `${sharedSurface} ${accent.border} bg-slate-950/72`,
  card: `${sharedCard} ${accent.cardBorder} bg-slate-900/78`,
  input: `${sharedInput} ${accent.cardBorder} bg-slate-950/88 text-slate-100 focus:border-current focus:ring-2 ${accent.ring}`,
  subtleButton: `${sharedButton} ${accent.cardBorder} bg-slate-900/75 font-medium text-slate-100 hover:bg-slate-800/90 border`,
  primaryButton: `${sharedButton} ${accent.tint} font-semibold text-slate-950 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50`,
  breadcrumb: `${accent.text} transition hover:text-white`,
  eyebrow: `${accent.text}`,
  heading: "text-slate-50",
  body: "text-slate-300",
  label: "text-slate-200",
  hint: "text-slate-400",
  metricLabel: "text-slate-300",
  pill: `rounded-full ${accent.cardBorder} bg-slate-900/80 px-3 py-1 text-xs font-medium ${accent.text} border`,
  emptyState: `rounded-3xl border border-dashed ${accent.cardBorder} bg-slate-900/60 p-8 text-center text-sm text-slate-300`,
} satisfies DashboardTheme);

export const incomeTheme = buildTheme({
  glowA: "rgba(14,165,233,0.24)",
  glowB: "rgba(34,197,94,0.18)",
  border: "border-sky-500/30",
  cardBorder: "border-sky-400/25",
  ring: "focus:ring-sky-400/30",
  tint: "bg-sky-300",
  text: "text-sky-200",
});

export const categoriesTheme = buildTheme({
  glowA: "rgba(251,191,36,0.18)",
  glowB: "rgba(249,115,22,0.16)",
  border: "border-amber-500/30",
  cardBorder: "border-amber-400/25",
  ring: "focus:ring-amber-400/30",
  tint: "bg-amber-300",
  text: "text-amber-200",
});

export const savingsTheme = buildTheme({
  glowA: "rgba(16,185,129,0.22)",
  glowB: "rgba(59,130,246,0.16)",
  border: "border-emerald-500/30",
  cardBorder: "border-emerald-400/25",
  ring: "focus:ring-emerald-400/30",
  tint: "bg-emerald-300",
  text: "text-emerald-200",
});

export const transactionsTheme = buildTheme({
  glowA: "rgba(168,85,247,0.22)",
  glowB: "rgba(56,189,248,0.16)",
  border: "border-violet-500/30",
  cardBorder: "border-violet-400/25",
  ring: "focus:ring-violet-400/30",
  tint: "bg-violet-300",
  text: "text-violet-200",
});

export const reportsTheme: DashboardTheme = {
  ...buildTheme({
    glowA: "rgba(244,114,182,0.2)",
    glowB: "rgba(14,165,233,0.16)",
    border: "border-rose-500/30",
    cardBorder: "border-rose-400/25",
    ring: "focus:ring-rose-400/30",
    tint: "bg-rose-300",
    text: "text-rose-200",
  }),
  dangerCard: "rounded-3xl border border-rose-400/30 bg-rose-950/45 p-5",
  dangerButton:
    "inline-flex items-center justify-center rounded-2xl border border-rose-400/35 bg-slate-950/80 px-4 py-2.5 text-sm font-medium text-rose-200 transition hover:bg-rose-950/70",
};
