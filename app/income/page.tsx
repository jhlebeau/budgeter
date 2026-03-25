"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { Income, useBudget } from "../budget-context";
import { ENTRY_NAME_ALLOWED_CHARACTERS_MESSAGE } from "@/lib/input-validation";
import {
  NO_STATE_INCOME_TAX_STATES,
  TAX_STATES,
  TAX_STATE_LABELS,
  TaxStateCode,
} from "@/lib/tax-states";
import { getCurrentMonthKey, isMonthInRange } from "@/lib/month-utils";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const FEDERAL_STANDARD_DEDUCTION_2026_SINGLE = 16100;

const FEDERAL_BRACKETS_2026_SINGLE = [
  { max: 12400, rate: 0.1 },
  { max: 50400, rate: 0.12 },
  { max: 105700, rate: 0.22 },
  { max: 201775, rate: 0.24 },
  { max: 256225, rate: 0.32 },
  { max: 640600, rate: 0.35 },
  { max: Number.POSITIVE_INFINITY, rate: 0.37 },
];

const CALIFORNIA_BRACKETS_ESTIMATE = [
  { max: 10756, rate: 0.01 },
  { max: 25499, rate: 0.02 },
  { max: 40245, rate: 0.04 },
  { max: 55866, rate: 0.06 },
  { max: 70606, rate: 0.08 },
  { max: 360659, rate: 0.093 },
  { max: 432787, rate: 0.103 },
  { max: 721314, rate: 0.113 },
  { max: 1000000, rate: 0.123 },
  { max: Number.POSITIVE_INFINITY, rate: 0.133 },
];

const CONNECTICUT_BRACKETS_2026_SINGLE = [
  { max: 10_000, rate: 0.02 },
  { max: 50_000, rate: 0.045 },
  { max: 100_000, rate: 0.055 },
  { max: 200_000, rate: 0.06 },
  { max: 250_000, rate: 0.065 },
  { max: 500_000, rate: 0.069 },
  { max: Number.POSITIVE_INFINITY, rate: 0.0699 },
];

const NEW_JERSEY_BRACKETS_2026_SINGLE = [
  { max: 20_000, rate: 0.014 },
  { max: 35_000, rate: 0.0175 },
  { max: 40_000, rate: 0.035 },
  { max: 75_000, rate: 0.05525 },
  { max: 500_000, rate: 0.0637 },
  { max: 1_000_000, rate: 0.0897 },
  { max: Number.POSITIVE_INFINITY, rate: 0.1075 },
];

const NEW_YORK_BRACKETS_2026_SINGLE = [
  { max: 8_500, rate: 0.039 },
  { max: 11_700, rate: 0.044 },
  { max: 13_900, rate: 0.0515 },
  { max: 80_650, rate: 0.054 },
  { max: 215_400, rate: 0.059 },
  { max: 1_077_550, rate: 0.0685 },
  { max: 5_000_000, rate: 0.0965 },
  { max: 25_000_000, rate: 0.103 },
  { max: Number.POSITIVE_INFINITY, rate: 0.109 },
];

const VIRGINIA_BRACKETS_SINGLE = [
  { max: 3_000, rate: 0.02 },
  { max: 5_000, rate: 0.03 },
  { max: 17_000, rate: 0.05 },
  { max: Number.POSITIVE_INFINITY, rate: 0.0575 },
];

type TaxState = TaxStateCode;

const TAX_STATE_OPTIONS: Array<{ code: TaxState; label: string }> = TAX_STATES.map(
  (code) => ({
    code,
    label: TAX_STATE_LABELS[code],
  }),
);

const FLAT_STATE_TAX_RATES: Partial<Record<TaxState, number>> = {
  AZ: 0.025,
  CO: 0.044,
  GA: 0.0519,
  ID: 0.053,
  IL: 0.0495,
  IN: 0.0295,
  IA: 0.039,
  KY: 0.035,
  LA: 0.03,
  MA: 0.05,
  MI: 0.0425,
  NC: 0.0399,
  OH: 0.0275,
  PA: 0.0307,
  UT: 0.045,
};

const GRADUATED_STATE_RATE_ESTIMATES: Partial<Record<TaxState, number>> = {
  AL: 0.05,
  AR: 0.039,
  CT: 0.0699,
  DE: 0.066,
  HI: 0.11,
  KS: 0.0558,
  ME: 0.0715,
  MD: 0.0575,
  MN: 0.0985,
  MO: 0.047,
  MT: 0.0565,
  NE: 0.0455,
  NJ: 0.1075,
  NM: 0.059,
  ND: 0.025,
  OK: 0.045,
  OR: 0.099,
  RI: 0.0599,
  SC: 0.06,
  VT: 0.0875,
  WI: 0.0765,
  WV: 0.0482,
};

const APPROXIMATED_GRADUATED_STATES = new Set<TaxState>(
  Object.keys(GRADUATED_STATE_RATE_ESTIMATES) as TaxState[],
);

type IncomeForm = {
  source: string;
  amount: string;
  period: "monthly" | "annual";
  startMonth: string;
  hasEndMonth: boolean;
  endMonth: string;
  taxType: "pre" | "post";
  taxMethod: "manual" | "auto";
  taxState: TaxState;
  taxRate: string;
};

const emptyForm: IncomeForm = {
  source: "",
  amount: "",
  period: "monthly",
  startMonth: "",
  hasEndMonth: false,
  endMonth: "",
  taxType: "post",
  taxMethod: "manual",
  taxState: "TX",
  taxRate: "0",
};

const surfaceClass =
  "rounded-3xl border border-slate-200/80 bg-white/90 shadow-[0_18px_60px_-32px_rgba(15,23,42,0.35)] backdrop-blur";
const inputClass =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200";
const selectClass = inputClass;
const subtleButtonClass =
  "inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50";
const primaryButtonClass =
  "inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800";

const calculateProgressiveTax = (
  taxableIncome: number,
  brackets: Array<{ max: number; rate: number }>,
) => {
  let tax = 0;
  let lowerBound = 0;

  for (const bracket of brackets) {
    if (taxableIncome <= lowerBound) break;
    const taxedAmount = Math.min(taxableIncome, bracket.max) - lowerBound;
    tax += taxedAmount * bracket.rate;
    lowerBound = bracket.max;
  }

  return tax;
};

const calculateFederalTax2026Single = (annualIncome: number) => {
  const taxableIncome = Math.max(
    0,
    annualIncome - FEDERAL_STANDARD_DEDUCTION_2026_SINGLE,
  );
  return calculateProgressiveTax(taxableIncome, FEDERAL_BRACKETS_2026_SINGLE);
};

const calculateStateTax = (annualIncome: number, taxState: TaxState) => {
  if (NO_STATE_INCOME_TAX_STATES.has(taxState)) return 0;

  if (taxState === "CA") {
    return calculateProgressiveTax(annualIncome, CALIFORNIA_BRACKETS_ESTIMATE);
  }
  if (taxState === "CT") {
    return calculateProgressiveTax(annualIncome, CONNECTICUT_BRACKETS_2026_SINGLE);
  }
  if (taxState === "NJ") {
    return calculateProgressiveTax(annualIncome, NEW_JERSEY_BRACKETS_2026_SINGLE);
  }
  if (taxState === "NY") {
    return calculateProgressiveTax(annualIncome, NEW_YORK_BRACKETS_2026_SINGLE);
  }
  if (taxState === "VA") {
    return calculateProgressiveTax(annualIncome, VIRGINIA_BRACKETS_SINGLE);
  }

  if (taxState === "MS") {
    return Math.max(0, annualIncome - 10_000) * 0.04;
  }

  const flatRate = FLAT_STATE_TAX_RATES[taxState];
  if (flatRate !== undefined) {
    return annualIncome * flatRate;
  }

  const estimatedRate = GRADUATED_STATE_RATE_ESTIMATES[taxState];
  if (estimatedRate !== undefined) {
    return annualIncome * estimatedRate;
  }

  return 0;
};

const getAutoTaxBreakdown = (annualAmount: number, taxState: TaxState) => {
  if (annualAmount <= 0) {
    return { combinedRate: 0, federalRate: 0, stateRate: 0 };
  }

  const federalTax = calculateFederalTax2026Single(annualAmount);
  const stateTax = calculateStateTax(annualAmount, taxState);
  return {
    combinedRate: ((federalTax + stateTax) / annualAmount) * 100,
    federalRate: (federalTax / annualAmount) * 100,
    stateRate: (stateTax / annualAmount) * 100,
  };
};

const toEditForm = (income: Income): IncomeForm => ({
  source: income.source,
  amount: String(income.inputAmount),
  period: income.period,
  startMonth: income.startMonth,
  hasEndMonth: income.endMonth !== null,
  endMonth: income.endMonth ?? "",
  taxType: income.taxType,
  taxMethod: income.taxMethod,
  taxState: income.taxState ?? "TX",
  taxRate: String(income.taxRate),
});

function SectionCard({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`${surfaceClass} p-6 sm:p-7`}>
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
          {eyebrow}
        </p>
        <h2 className="mt-2 text-xl font-semibold text-slate-950">{title}</h2>
        {description ? (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function FieldLabel({
  label,
  hint,
}: {
  label: string;
  hint?: string;
}) {
  return (
    <div className="mb-2 flex items-center justify-between gap-3">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      {hint ? <span className="text-xs text-slate-400">{hint}</span> : null}
    </div>
  );
}

function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className={`${surfaceClass} p-5`}>
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">{value}</p>
      <p className="mt-2 text-sm text-slate-500">{detail}</p>
    </div>
  );
}

export default function IncomePage() {
  const { incomes, addIncome, updateIncome, deleteIncome } = useBudget();
  const currentMonthKey = getCurrentMonthKey();
  const [form, setForm] = useState<IncomeForm>(() => ({
    ...emptyForm,
    startMonth: getCurrentMonthKey(),
  }));
  const [submitError, setSubmitError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<IncomeForm>(emptyForm);

  const getEffectiveTaxRate = (annualAmount: number, values: IncomeForm) => {
    if (values.taxType !== "pre") return 0;
    if (values.taxMethod === "manual") {
      return Number(values.taxRate) || 0;
    }

    return getAutoTaxBreakdown(annualAmount, values.taxState).combinedRate;
  };

  const monthlyAmount = useMemo(() => {
    const amount = Number(form.amount) || 0;
    return form.period === "annual" ? amount / 12 : amount;
  }, [form.amount, form.period]);
  const annualAmount = monthlyAmount * 12;
  const autoTaxBreakdown = useMemo(
    () => getAutoTaxBreakdown(annualAmount, form.taxState),
    [annualAmount, form.taxState],
  );
  const effectiveTaxRate =
    form.taxType === "pre"
      ? form.taxMethod === "auto"
        ? autoTaxBreakdown.combinedRate
        : Number(form.taxRate) || 0
      : 0;
  const postTaxPreview =
    form.taxType === "pre"
      ? monthlyAmount * (1 - effectiveTaxRate / 100)
      : monthlyAmount;
  const showAutoTaxPreview = form.taxType === "pre" && form.taxMethod === "auto";

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError("");
    const startMonth = form.startMonth || getCurrentMonthKey();
    const endMonth = form.hasEndMonth ? form.endMonth || null : null;
    if (endMonth && endMonth < startMonth) {
      setSubmitError("End month cannot be earlier than start month.");
      return;
    }

    const error = await addIncome({
      source: form.source,
      amount: form.period === "annual" ? annualAmount : monthlyAmount,
      period: form.period,
      startMonth,
      endMonth,
      taxType: form.taxType,
      taxMethod: form.taxType === "pre" ? form.taxMethod : "manual",
      taxState: form.taxType === "pre" && form.taxMethod === "auto" ? form.taxState : null,
      taxRate: form.taxType === "pre" ? effectiveTaxRate : 0,
    });
    if (error) {
      setSubmitError(error);
      return;
    }

    setForm({ ...emptyForm, startMonth: getCurrentMonthKey() });
  };

  const startEdit = (income: Income) => {
    setEditingId(income.id);
    setEditForm(toEditForm(income));
  };

  const saveEdit = async () => {
    if (editingId === null) return;

    const monthlyEditAmount =
      editForm.period === "annual"
        ? (Number(editForm.amount) || 0) / 12
        : Number(editForm.amount) || 0;
    const annualEditAmount = monthlyEditAmount * 12;
    const editAutoRate = getEffectiveTaxRate(annualEditAmount, editForm);
    const editEffectiveRate =
      editForm.taxType === "pre"
        ? editForm.taxMethod === "auto"
          ? editAutoRate
          : Number(editForm.taxRate) || 0
        : 0;

    await updateIncome(editingId, {
      source: editForm.source,
      amount: editForm.period === "annual" ? annualEditAmount : monthlyEditAmount,
      period: editForm.period,
      startMonth: editForm.startMonth,
      endMonth: editForm.hasEndMonth ? editForm.endMonth || null : null,
      taxType: editForm.taxType,
      taxMethod: editForm.taxType === "pre" ? editForm.taxMethod : "manual",
      taxState:
        editForm.taxType === "pre" && editForm.taxMethod === "auto"
          ? editForm.taxState
          : null,
      taxRate: editForm.taxType === "pre" ? editEffectiveRate : 0,
    });

    setEditingId(null);
    setEditForm(emptyForm);
  };

  const totalMonthlyIncomeSummary = useMemo(() => {
    const activeIncomes = incomes.filter((income) =>
      isMonthInRange(currentMonthKey, income.startMonth, income.endMonth),
    );

    let directMonthlyPostTaxTotal = 0;
    const autoPreTaxAnnualByState: Partial<Record<TaxState, number>> = {};

    for (const income of activeIncomes) {
      if (income.taxType !== "pre") {
        directMonthlyPostTaxTotal += income.postTaxAmount;
        continue;
      }

      if (income.taxMethod === "auto" && income.taxState) {
        autoPreTaxAnnualByState[income.taxState] =
          (autoPreTaxAnnualByState[income.taxState] ?? 0) + income.amount * 12;
        continue;
      }

      directMonthlyPostTaxTotal += income.postTaxAmount;
    }

    const totalAutoPreTaxAnnual = Object.values(autoPreTaxAnnualByState).reduce(
      (total, annualAmount) => total + annualAmount,
      0,
    );
    if (totalAutoPreTaxAnnual <= 0) {
      return {
        monthlyIncome: directMonthlyPostTaxTotal,
        combinedRate: 0,
        federalRate: 0,
        stateRate: 0,
      };
    }

    const cumulativeFederalTax = calculateFederalTax2026Single(totalAutoPreTaxAnnual);
    const cumulativeStateTax = (
      Object.entries(autoPreTaxAnnualByState) as Array<[TaxState, number]>
    ).reduce(
      (total, [taxState, incomeAmount]) =>
        total + calculateStateTax(incomeAmount, taxState),
      0,
    );
    const combinedTaxRate =
      ((cumulativeFederalTax + cumulativeStateTax) / totalAutoPreTaxAnnual) * 100;
    const federalTaxRate = (cumulativeFederalTax / totalAutoPreTaxAnnual) * 100;
    const stateTaxRate = (cumulativeStateTax / totalAutoPreTaxAnnual) * 100;
    const cumulativeAutoPostTaxMonthly = Math.max(
      0,
      totalAutoPreTaxAnnual - cumulativeFederalTax - cumulativeStateTax,
    ) / 12;

    return {
      monthlyIncome: directMonthlyPostTaxTotal + cumulativeAutoPostTaxMonthly,
      combinedRate: combinedTaxRate,
      federalRate: federalTaxRate,
      stateRate: stateTaxRate,
    };
  }, [currentMonthKey, incomes]);

  const activeIncomes = useMemo(
    () =>
      incomes.filter((income) =>
        isMonthInRange(currentMonthKey, income.startMonth, income.endMonth),
      ),
    [currentMonthKey, incomes],
  );
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(148,163,184,0.16),_transparent_36%),linear-gradient(180deg,_#f8fafc_0%,_#eef2f7_100%)] px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className={`${surfaceClass} overflow-hidden p-6 sm:p-8`}>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
                <Link href="/setup" className="text-slate-500 transition hover:text-slate-900">
                  Setup
                </Link>
                <span className="text-slate-300">/</span>
                <Link href="/home" className="text-slate-500 transition hover:text-slate-900">
                  Home
                </Link>
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
                Income Dashboard
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                Plan income with a cleaner monthly view
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
                Add salary, freelance, or seasonal income sources, estimate taxes,
                and keep a polished snapshot of what is available each month.
              </p>
            </div>
            <div className="grid w-full gap-3 sm:grid-cols-2 lg:max-w-md">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <p className="text-sm text-slate-500">This month</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">
                  {currencyFormatter.format(totalMonthlyIncomeSummary.monthlyIncome)}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <p className="text-sm text-slate-500">Sources tracked</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">{incomes.length}</p>
              </div>
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <MetricCard
            label="Net monthly income"
            value={currencyFormatter.format(totalMonthlyIncomeSummary.monthlyIncome)}
            detail={`Across ${activeIncomes.length} active source${activeIncomes.length === 1 ? "" : "s"} in ${currentMonthKey}`}
          />
          <MetricCard
            label="Combined tax rate"
            value={`${totalMonthlyIncomeSummary.combinedRate.toFixed(2)}%`}
            detail={`${totalMonthlyIncomeSummary.federalRate.toFixed(2)}% federal and ${totalMonthlyIncomeSummary.stateRate.toFixed(2)}% state`}
          />
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <SectionCard
            eyebrow="New Source"
            title="Add income"
            description="Capture the timing, amount, and tax handling for each source so downstream spending and savings views stay grounded in usable cash flow."
          >
            <form onSubmit={onSubmit} className="space-y-6">
              <div className="grid gap-5 md:grid-cols-2">
                <div className="md:col-span-2">
                  <FieldLabel label="Income source" hint="Up to 80 characters" />
                  <input
                    type="text"
                    placeholder="Salary, contract work, rental income"
                    value={form.source}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, source: event.target.value }))
                    }
                    pattern="[A-Za-z0-9 _-]+"
                    title={ENTRY_NAME_ALLOWED_CHARACTERS_MESSAGE}
                    maxLength={80}
                    className={inputClass}
                    required
                  />
                </div>

                <div>
                  <FieldLabel label="Amount cadence" />
                  <select
                    value={form.period}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        period: event.target.value as "monthly" | "annual",
                      }))
                    }
                    className={selectClass}
                  >
                    <option value="monthly">Monthly amount</option>
                    <option value="annual">Annual amount</option>
                  </select>
                </div>

                <div>
                  <FieldLabel label="Amount" />
                  <div className="relative">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                      $
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={form.amount}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, amount: event.target.value }))
                      }
                      className={`${inputClass} pl-8`}
                      required
                    />
                  </div>
                </div>

                <div>
                  <FieldLabel label="Start month" />
                  <input
                    type="month"
                    value={form.startMonth}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, startMonth: event.target.value }))
                    }
                    className={inputClass}
                    required
                  />
                </div>

                <div className="flex items-end">
                  <label className="flex min-h-[52px] w-full items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={form.hasEndMonth}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          hasEndMonth: event.target.checked,
                          endMonth: event.target.checked ? current.endMonth : "",
                        }))
                      }
                      className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
                    />
                    Set an end month
                  </label>
                </div>

                {form.hasEndMonth ? (
                  <div>
                    <FieldLabel label="End month" />
                    <input
                      type="month"
                      value={form.endMonth}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, endMonth: event.target.value }))
                      }
                      className={inputClass}
                      min={form.startMonth}
                    />
                  </div>
                ) : null}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5">
                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <FieldLabel label="Income type" />
                    <select
                      value={form.taxType}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          taxType: event.target.value as "pre" | "post",
                        }))
                      }
                      className={selectClass}
                    >
                      <option value="post">Post-tax income</option>
                      <option value="pre">Pre-tax income</option>
                    </select>
                  </div>

                  {form.taxType === "pre" ? (
                    <div>
                      <FieldLabel label="Tax handling" />
                      <select
                        value={form.taxMethod}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            taxMethod: event.target.value as "manual" | "auto",
                          }))
                        }
                        className={selectClass}
                      >
                        <option value="manual">Manual tax rate</option>
                        <option value="auto">Auto-calculate tax</option>
                      </select>
                    </div>
                  ) : null}

                  {form.taxType === "pre" && form.taxMethod === "manual" ? (
                    <div>
                      <FieldLabel label="Tax rate" hint="Percent" />
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        placeholder="0.0"
                        value={form.taxRate}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            taxRate: event.target.value,
                          }))
                        }
                        className={inputClass}
                        required
                      />
                    </div>
                  ) : null}

                  {form.taxType === "pre" && form.taxMethod === "auto" ? (
                    <div>
                      <FieldLabel label="Tax state" />
                      <select
                        value={form.taxState}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            taxState: event.target.value as TaxState,
                          }))
                        }
                        className={selectClass}
                      >
                        {TAX_STATE_OPTIONS.map((state) => (
                          <option key={state.code} value={state.code}>
                            {state.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : null}
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Net Monthly
                    </p>
                    <p className="mt-2 text-xl font-semibold text-slate-950">
                      {currencyFormatter.format(postTaxPreview)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Federal Rate
                    </p>
                    <p className="mt-2 text-xl font-semibold text-slate-950">
                      {showAutoTaxPreview
                        ? `${autoTaxBreakdown.federalRate.toFixed(2)}%`
                        : "None"}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      State Rate
                    </p>
                    <p className="mt-2 text-xl font-semibold text-slate-950">
                      {showAutoTaxPreview
                        ? `${autoTaxBreakdown.stateRate.toFixed(2)}%`
                        : "None"}
                    </p>
                  </div>
                </div>

                {form.taxType === "pre" && form.taxMethod === "auto" ? (
                  <p className="mt-4 text-sm leading-6 text-slate-500">
                    Estimated combined tax rate:{" "}
                    <span className="font-medium text-slate-700">
                      {autoTaxBreakdown.combinedRate.toFixed(2)}%
                    </span>
                    {APPROXIMATED_GRADUATED_STATES.has(form.taxState) ? (
                      <span className="ml-2 text-amber-700">
                        This state currently uses a simplified approximation.
                      </span>
                    ) : null}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5">
                <div>
                  <p className="text-sm text-slate-500">
                    Saved entries update the monthly summary immediately.
                  </p>
                  {submitError ? (
                    <p className="mt-2 text-sm font-medium text-red-600">{submitError}</p>
                  ) : null}
                </div>
                <button type="submit" className={primaryButtonClass}>
                  Add income source
                </button>
              </div>
            </form>
          </SectionCard>

          <SectionCard
            eyebrow="Portfolio"
            title="Tracked income sources"
            description="Review active and future sources, refine tax assumptions, and edit or remove entries without leaving the page."
          >
            <div className="mb-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <p className="text-sm text-slate-500">Current month total</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">
                  {currencyFormatter.format(totalMonthlyIncomeSummary.monthlyIncome)}
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  Federal {totalMonthlyIncomeSummary.federalRate.toFixed(2)}%,
                  state {totalMonthlyIncomeSummary.stateRate.toFixed(2)}%
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <p className="text-sm text-slate-500">Active this month</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">
                  {activeIncomes.length}
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  Based on the {currentMonthKey} start and end month windows
                </p>
              </div>
            </div>

            <ul className="space-y-4">
              {incomes.map((income) => {
                const itemAutoBreakdown =
                  income.taxType === "pre" &&
                  income.taxMethod === "auto" &&
                  income.taxState
                    ? getAutoTaxBreakdown(income.amount * 12, income.taxState)
                    : null;
                const editAutoBreakdown = getAutoTaxBreakdown(
                  editForm.period === "annual"
                    ? Number(editForm.amount) || 0
                    : (Number(editForm.amount) || 0) * 12,
                  editForm.taxState,
                );
                const isActive = isMonthInRange(
                  currentMonthKey,
                  income.startMonth,
                  income.endMonth,
                );

                return (
                  <li
                    key={income.id}
                    className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5"
                  >
                    {editingId === income.id ? (
                      <div className="space-y-5">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                              Editing source
                            </p>
                            <h3 className="mt-2 text-lg font-semibold text-slate-950">
                              {income.source}
                            </h3>
                          </div>
                          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-500">
                            {income.taxType === "pre" ? "Pre-tax" : "Post-tax"}
                          </span>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="md:col-span-2">
                            <FieldLabel label="Source name" />
                            <input
                              type="text"
                              value={editForm.source}
                              onChange={(event) =>
                                setEditForm((current) => ({
                                  ...current,
                                  source: event.target.value,
                                }))
                              }
                              pattern="[A-Za-z0-9 _-]+"
                              title={ENTRY_NAME_ALLOWED_CHARACTERS_MESSAGE}
                              maxLength={80}
                              className={inputClass}
                            />
                          </div>

                          <div>
                            <FieldLabel label="Amount" />
                            <div className="relative">
                              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                                $
                              </span>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={editForm.amount}
                                onChange={(event) =>
                                  setEditForm((current) => ({
                                    ...current,
                                    amount: event.target.value,
                                  }))
                                }
                                className={`${inputClass} pl-8`}
                              />
                            </div>
                          </div>

                          <div>
                            <FieldLabel label="Amount cadence" />
                            <select
                              value={editForm.period}
                              onChange={(event) =>
                                setEditForm((current) => ({
                                  ...current,
                                  period: event.target.value as "monthly" | "annual",
                                }))
                              }
                              className={selectClass}
                            >
                              <option value="monthly">Monthly amount</option>
                              <option value="annual">Annual amount</option>
                            </select>
                          </div>

                          <div>
                            <FieldLabel label="Start month" />
                            <input
                              type="month"
                              value={editForm.startMonth}
                              onChange={(event) =>
                                setEditForm((current) => ({
                                  ...current,
                                  startMonth: event.target.value,
                                }))
                              }
                              className={inputClass}
                              required
                            />
                          </div>

                          <div className="flex items-end">
                            <label className="flex min-h-[52px] w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                              <input
                                type="checkbox"
                                checked={editForm.hasEndMonth}
                                onChange={(event) =>
                                  setEditForm((current) => ({
                                    ...current,
                                    hasEndMonth: event.target.checked,
                                    endMonth: event.target.checked ? current.endMonth : "",
                                  }))
                                }
                                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
                              />
                              Set an end month
                            </label>
                          </div>

                          {editForm.hasEndMonth ? (
                            <div>
                              <FieldLabel label="End month" />
                              <input
                                type="month"
                                value={editForm.endMonth}
                                onChange={(event) =>
                                  setEditForm((current) => ({
                                    ...current,
                                    endMonth: event.target.value,
                                  }))
                                }
                                className={inputClass}
                                min={editForm.startMonth}
                              />
                            </div>
                          ) : null}

                          <div>
                            <FieldLabel label="Income type" />
                            <select
                              value={editForm.taxType}
                              onChange={(event) =>
                                setEditForm((current) => ({
                                  ...current,
                                  taxType: event.target.value as "pre" | "post",
                                }))
                              }
                              className={selectClass}
                            >
                              <option value="post">Post-tax income</option>
                              <option value="pre">Pre-tax income</option>
                            </select>
                          </div>

                          {editForm.taxType === "pre" ? (
                            <div>
                              <FieldLabel label="Tax handling" />
                              <select
                                value={editForm.taxMethod}
                                onChange={(event) =>
                                  setEditForm((current) => ({
                                    ...current,
                                    taxMethod: event.target.value as "manual" | "auto",
                                  }))
                                }
                                className={selectClass}
                              >
                                <option value="manual">Manual tax rate</option>
                                <option value="auto">Auto-calculate tax</option>
                              </select>
                            </div>
                          ) : null}

                          {editForm.taxType === "pre" && editForm.taxMethod === "manual" ? (
                            <div>
                              <FieldLabel label="Tax rate" hint="Percent" />
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                max="100"
                                value={editForm.taxRate}
                                onChange={(event) =>
                                  setEditForm((current) => ({
                                    ...current,
                                    taxRate: event.target.value,
                                  }))
                                }
                                className={inputClass}
                              />
                            </div>
                          ) : null}

                          {editForm.taxType === "pre" && editForm.taxMethod === "auto" ? (
                            <div>
                              <FieldLabel label="Tax state" />
                              <select
                                value={editForm.taxState}
                                onChange={(event) =>
                                  setEditForm((current) => ({
                                    ...current,
                                    taxState: event.target.value as TaxState,
                                  }))
                                }
                                className={selectClass}
                              >
                                {TAX_STATE_OPTIONS.map((state) => (
                                  <option key={state.code} value={state.code}>
                                    {state.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          ) : null}
                        </div>

                        {editForm.taxType === "pre" && editForm.taxMethod === "auto" ? (
                          <div className="grid gap-3 md:grid-cols-3">
                            <div className="rounded-2xl border border-slate-200 bg-white p-4">
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                                Combined
                              </p>
                              <p className="mt-2 text-lg font-semibold text-slate-950">
                                {editAutoBreakdown.combinedRate.toFixed(2)}%
                              </p>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-white p-4">
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                                Federal
                              </p>
                              <p className="mt-2 text-lg font-semibold text-slate-950">
                                {editAutoBreakdown.federalRate.toFixed(2)}%
                              </p>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-white p-4">
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                                State
                              </p>
                              <p className="mt-2 text-lg font-semibold text-slate-950">
                                {editAutoBreakdown.stateRate.toFixed(2)}%
                              </p>
                            </div>
                          </div>
                        ) : null}

                        {editForm.taxType === "pre" &&
                        editForm.taxMethod === "auto" &&
                        APPROXIMATED_GRADUATED_STATES.has(editForm.taxState) ? (
                          <p className="text-sm text-amber-700">
                            This state currently uses a simplified tax approximation.
                          </p>
                        ) : null}

                        <div className="flex flex-wrap gap-3">
                          <button type="button" onClick={saveEdit} className={primaryButtonClass}>
                            Save changes
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(null);
                              setEditForm(emptyForm);
                            }}
                            className={subtleButtonClass}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-lg font-semibold text-slate-950">
                                {income.source}
                              </h3>
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-medium ${
                                  isActive
                                    ? "bg-emerald-50 text-emerald-700"
                                    : "bg-slate-200/70 text-slate-600"
                                }`}
                              >
                                {isActive ? "Active" : "Inactive"}
                              </span>
                              <span className="rounded-full bg-slate-200/70 px-3 py-1 text-xs font-medium text-slate-600">
                                {income.taxType === "pre" ? "Pre-tax" : "Post-tax"}
                              </span>
                            </div>
                            <p className="mt-2 text-sm text-slate-500">
                              {income.period === "annual" ? "Annual" : "Monthly"} input of{" "}
                              {currencyFormatter.format(income.inputAmount)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-slate-500">Net monthly value</p>
                            <p className="mt-1 text-2xl font-semibold text-slate-950">
                              {currencyFormatter.format(income.postTaxAmount)}
                            </p>
                          </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                          <div className="rounded-2xl border border-slate-200 bg-white p-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                              Schedule
                            </p>
                            <p className="mt-2 text-sm font-medium text-slate-900">
                              {income.startMonth}
                              {income.endMonth ? ` to ${income.endMonth}` : " onward"}
                            </p>
                          </div>
                          <div className="rounded-2xl border border-slate-200 bg-white p-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                              Tax Rate
                            </p>
                            <p className="mt-2 text-sm font-medium text-slate-900">
                              {income.taxType === "pre"
                                ? `${income.taxRate.toFixed(2)}%`
                                : "Not applicable"}
                            </p>
                          </div>
                          <div className="rounded-2xl border border-slate-200 bg-white p-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                              Federal
                            </p>
                            <p className="mt-2 text-sm font-medium text-slate-900">
                              {itemAutoBreakdown
                                ? `${itemAutoBreakdown.federalRate.toFixed(2)}%`
                                : "Included"}
                            </p>
                          </div>
                          <div className="rounded-2xl border border-slate-200 bg-white p-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                              State
                            </p>
                            <p className="mt-2 text-sm font-medium text-slate-900">
                              {income.taxType === "pre" && income.taxMethod === "auto" && income.taxState
                                ? `${TAX_STATE_LABELS[income.taxState]} • ${itemAutoBreakdown?.stateRate.toFixed(2)}%`
                                : income.taxType === "pre"
                                  ? "Manual"
                                  : "Not applicable"}
                            </p>
                          </div>
                        </div>

                        {income.taxType === "pre" &&
                        income.taxMethod === "auto" &&
                        income.taxState &&
                        APPROXIMATED_GRADUATED_STATES.has(income.taxState) ? (
                          <p className="text-sm text-amber-700">
                            This source uses a simplified state tax approximation.
                          </p>
                        ) : null}

                        <div className="flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={() => startEdit(income)}
                            className={subtleButtonClass}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              const shouldDelete = window.confirm(
                                "Delete this income source?",
                              );
                              if (!shouldDelete) return;
                              await deleteIncome(income.id);
                            }}
                            className="inline-flex items-center justify-center rounded-2xl border border-red-200 bg-white px-4 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
              {incomes.length === 0 ? (
                <li className="rounded-3xl border border-dashed border-slate-300 bg-slate-50/80 p-8 text-center text-sm text-slate-500">
                  No income sources yet. Add your first source to start building a cleaner
                  cash flow view.
                </li>
              ) : null}
            </ul>
          </SectionCard>
        </div>
      </div>
    </main>
  );
}
