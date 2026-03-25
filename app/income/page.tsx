"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { Income, useBudget } from "../budget-context";
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

// Estimated flat rates for states with single-rate individual income taxes in 2026.
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

// For graduated-rate states, we use a top-rate estimate as a simple approximation.
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

export default function IncomePage() {
  const { incomes, addIncome, updateIncome, deleteIncome } = useBudget();
  const currentMonthKey = getCurrentMonthKey();
  const [form, setForm] = useState<IncomeForm>(() => ({
    ...emptyForm,
    startMonth: getCurrentMonthKey(),
  }));
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
    [annualAmount, form],
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

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const startMonth = form.startMonth || getCurrentMonthKey();
    const endMonth = form.hasEndMonth ? form.endMonth || null : null;
    if (endMonth && endMonth < startMonth) return;

    await addIncome({
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
      (total, [taxState, annualAmount]) =>
      total + calculateStateTax(annualAmount, taxState),
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

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <div className="mb-5 flex gap-4 text-sm">
        <Link href="/setup" className="text-zinc-600 hover:underline">
          Back to Setup
        </Link>
        <Link href="/home" className="text-zinc-600 hover:underline">
          Back to Home
        </Link>
      </div>
      <h1 className="mb-4 text-2xl font-semibold">Add Income</h1>

      <form onSubmit={onSubmit} className="space-y-3 rounded-lg border p-4">
        <input
          type="text"
          placeholder="Income source (ex. Salary)"
          value={form.source}
          onChange={(event) =>
            setForm((current) => ({ ...current, source: event.target.value }))
          }
          maxLength={80}
          className="w-full rounded border px-3 py-2"
          required
        />
        <select
          value={form.period}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              period: event.target.value as "monthly" | "annual",
            }))
          }
          className="w-full rounded border px-3 py-2"
        >
          <option value="monthly">Monthly amount</option>
          <option value="annual">Annual amount</option>
        </select>
        <div>
          <label className="mb-1 block text-sm font-medium">Start Month</label>
          <input
            type="month"
            value={form.startMonth}
            onChange={(event) =>
              setForm((current) => ({ ...current, startMonth: event.target.value }))
            }
            className="w-full rounded border px-3 py-2"
            required
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
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
          />
          Add end month
        </label>
        {form.hasEndMonth ? (
          <div>
            <label className="mb-1 block text-sm font-medium">End Month</label>
            <input
              type="month"
              value={form.endMonth}
              onChange={(event) =>
                setForm((current) => ({ ...current, endMonth: event.target.value }))
              }
              className="w-full rounded border px-3 py-2"
              min={form.startMonth}
            />
          </div>
        ) : null}
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
            $
          </span>
          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="Income amount"
            value={form.amount}
            onChange={(event) =>
              setForm((current) => ({ ...current, amount: event.target.value }))
            }
            className="w-full rounded border py-2 pr-3 pl-7"
            required
          />
        </div>
        <select
          value={form.taxType}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              taxType: event.target.value as "pre" | "post",
            }))
          }
          className="w-full rounded border px-3 py-2"
        >
          <option value="post">Post-tax income</option>
          <option value="pre">Pre-tax income</option>
        </select>
        {form.taxType === "pre" ? (
          <>
            <select
              value={form.taxMethod}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  taxMethod: event.target.value as "manual" | "auto",
                }))
              }
              className="w-full rounded border px-3 py-2"
            >
              <option value="manual">Manually enter tax rate</option>
              <option value="auto">Auto-calculate tax</option>
            </select>
            {form.taxMethod === "manual" ? (
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Tax Rate (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  placeholder="Tax rate (%)"
                  value={form.taxRate}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      taxRate: event.target.value,
                    }))
                  }
                  className="w-full rounded border px-3 py-2"
                  required
                />
              </div>
            ) : (
              <>
                <select
                  value={form.taxState}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      taxState: event.target.value as TaxState,
                    }))
                  }
                  className="w-full rounded border px-3 py-2"
                >
                  {TAX_STATE_OPTIONS.map((state) => (
                    <option key={state.code} value={state.code}>
                      {state.label}
                    </option>
                  ))}
                </select>
                <p className="text-sm text-zinc-700">
                  Estimated combined tax rate (federal + state):{" "}
                  {autoTaxBreakdown.combinedRate.toFixed(2)}%
                </p>
                <p className="text-sm text-zinc-700">
                  Estimated federal tax rate:{" "}
                  {autoTaxBreakdown.federalRate.toFixed(2)}%
                </p>
                <p className="text-sm text-zinc-700">
                  Estimated state tax rate: {autoTaxBreakdown.stateRate.toFixed(2)}%
                </p>
                {APPROXIMATED_GRADUATED_STATES.has(form.taxState) ? (
                  <p className="text-sm text-amber-700">
                    Warning: This state currently uses a simplified tax approximation.
                  </p>
                ) : null}
              </>
            )}
          </>
        ) : null}
        <p className="text-sm text-zinc-700">
          Post-tax monthly value: {currencyFormatter.format(postTaxPreview)}
        </p>
        <button
          type="submit"
          className="rounded bg-black px-4 py-2 text-white hover:bg-zinc-800"
        >
          Add Income
        </button>
      </form>

      <section className="mt-6">
        <h2 className="mb-3 text-lg font-medium">Total Monthly Income</h2>
        <div className="mb-4 rounded border px-3 py-2 text-sm">
          <p className="font-medium">
            {currencyFormatter.format(totalMonthlyIncomeSummary.monthlyIncome)}
          </p>
          <p className="text-zinc-700">
            Total combined tax rate: {totalMonthlyIncomeSummary.combinedRate.toFixed(2)}%
          </p>
          <p className="text-zinc-700">
            Total federal tax rate: {totalMonthlyIncomeSummary.federalRate.toFixed(2)}%
          </p>
          <p className="text-zinc-700">
            Total state tax rate: {totalMonthlyIncomeSummary.stateRate.toFixed(2)}%
          </p>
        </div>

        <h3 className="mb-3 text-base font-medium">Individual Monthly Incomes</h3>
        <ul className="space-y-2">
          {incomes.map((income) => (
            <li key={income.id} className="rounded border px-3 py-2 text-sm">
              {editingId === income.id ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={editForm.source}
                    onChange={(event) =>
                      setEditForm((current) => ({
                        ...current,
                        source: event.target.value,
                      }))
                    }
                    maxLength={80}
                    className="w-full rounded border px-3 py-2"
                  />
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
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
                      className="w-full rounded border py-2 pr-3 pl-7"
                    />
                  </div>
                  <select
                    value={editForm.period}
                    onChange={(event) =>
                      setEditForm((current) => ({
                        ...current,
                        period: event.target.value as "monthly" | "annual",
                      }))
                    }
                    className="w-full rounded border px-3 py-2"
                  >
                    <option value="monthly">Monthly amount</option>
                    <option value="annual">Annual amount</option>
                  </select>
                  <select
                    value={editForm.taxType}
                    onChange={(event) =>
                      setEditForm((current) => ({
                        ...current,
                        taxType: event.target.value as "pre" | "post",
                      }))
                    }
                    className="w-full rounded border px-3 py-2"
                  >
                    <option value="post">Post-tax income</option>
                    <option value="pre">Pre-tax income</option>
                  </select>
                  <div>
                    <label className="mb-1 block text-sm font-medium">Start Month</label>
                    <input
                      type="month"
                      value={editForm.startMonth}
                      onChange={(event) =>
                        setEditForm((current) => ({
                          ...current,
                          startMonth: event.target.value,
                        }))
                      }
                      className="w-full rounded border px-3 py-2"
                      required
                    />
                  </div>
                  <label className="flex items-center gap-2 text-sm">
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
                    />
                    Add end month
                  </label>
                  {editForm.hasEndMonth ? (
                    <div>
                      <label className="mb-1 block text-sm font-medium">End Month</label>
                      <input
                        type="month"
                        value={editForm.endMonth}
                        onChange={(event) =>
                          setEditForm((current) => ({
                            ...current,
                            endMonth: event.target.value,
                          }))
                        }
                        className="w-full rounded border px-3 py-2"
                        min={editForm.startMonth}
                      />
                    </div>
                  ) : null}
                  {editForm.taxType === "pre" ? (
                    <>
                      <select
                        value={editForm.taxMethod}
                        onChange={(event) =>
                          setEditForm((current) => ({
                            ...current,
                            taxMethod: event.target.value as "manual" | "auto",
                          }))
                        }
                        className="w-full rounded border px-3 py-2"
                      >
                        <option value="manual">Manually enter tax rate</option>
                        <option value="auto">Auto-calculate tax</option>
                      </select>
                      {editForm.taxMethod === "manual" ? (
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
                          className="w-full rounded border px-3 py-2"
                        />
                      ) : (
                        <>
                          <select
                            value={editForm.taxState}
                            onChange={(event) =>
                              setEditForm((current) => ({
                                ...current,
                                taxState: event.target.value as TaxState,
                              }))
                            }
                            className="w-full rounded border px-3 py-2"
                          >
                            {TAX_STATE_OPTIONS.map((state) => (
                              <option key={state.code} value={state.code}>
                                {state.label}
                              </option>
                            ))}
                          </select>
                          <p className="text-sm text-zinc-700">
                            Estimated combined tax rate (federal + state):{" "}
                            {getAutoTaxBreakdown(
                              editForm.period === "annual"
                                ? Number(editForm.amount) || 0
                                : (Number(editForm.amount) || 0) * 12,
                              editForm.taxState,
                            ).combinedRate.toFixed(2)}
                            %
                          </p>
                          <p className="text-sm text-zinc-700">
                            Estimated federal tax rate:{" "}
                            {getAutoTaxBreakdown(
                              editForm.period === "annual"
                                ? Number(editForm.amount) || 0
                                : (Number(editForm.amount) || 0) * 12,
                              editForm.taxState,
                            ).federalRate.toFixed(2)}
                            %
                          </p>
                          <p className="text-sm text-zinc-700">
                            Estimated state tax rate:{" "}
                            {getAutoTaxBreakdown(
                              editForm.period === "annual"
                                ? Number(editForm.amount) || 0
                                : (Number(editForm.amount) || 0) * 12,
                              editForm.taxState,
                            ).stateRate.toFixed(2)}
                            %
                          </p>
                          {APPROXIMATED_GRADUATED_STATES.has(editForm.taxState) ? (
                            <p className="text-sm text-amber-700">
                              Warning: This state currently uses a simplified tax approximation.
                            </p>
                          ) : null}
                        </>
                      )}
                    </>
                  ) : null}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={saveEdit}
                      className="rounded bg-black px-3 py-1.5 text-white hover:bg-zinc-800"
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
                  {income.taxType === "pre" &&
                  income.taxMethod === "auto" &&
                  income.taxState ? (
                    (() => {
                      const breakdown = getAutoTaxBreakdown(
                        income.amount * 12,
                        income.taxState,
                      );
                      return (
                        <>
                          <p>Combined tax rate: {breakdown.combinedRate.toFixed(2)}%</p>
                          <p>Federal tax rate: {breakdown.federalRate.toFixed(2)}%</p>
                          <p>State tax rate: {breakdown.stateRate.toFixed(2)}%</p>
                        </>
                      );
                    })()
                  ) : null}
                  <p className="font-medium">{income.source}</p>
                  <p>{income.taxType === "pre" ? "Pre-tax" : "Post-tax"}</p>
                  {income.taxType === "pre" ? (
                    <p>Tax rate: {income.taxRate.toFixed(2)}%</p>
                  ) : null}
                  {income.taxType === "pre" && income.taxMethod === "auto" && income.taxState ? (
                    <p>State: {income.taxState}</p>
                  ) : null}
                  <p>
                    Individual post-tax monthly value:{" "}
                    {currencyFormatter.format(income.postTaxAmount)}
                  </p>
                  <button
                    type="button"
                    onClick={() => startEdit(income)}
                    className="mt-2 rounded border px-3 py-1.5 hover:bg-zinc-50"
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
                    className="mt-2 ml-2 rounded border px-3 py-1.5 text-red-600 hover:bg-zinc-50"
                  >
                    Delete
                  </button>
                </>
              )}
            </li>
          ))}
          {incomes.length === 0 ? (
            <li className="text-sm text-zinc-500">No income entries yet.</li>
          ) : null}
        </ul>
      </section>
    </main>
  );
}
