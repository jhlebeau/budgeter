"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { Income, useBudget } from "../budget-context";

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

type TaxState = "CA" | "TX" | "MA";

type IncomeForm = {
  source: string;
  amount: string;
  period: "monthly" | "annual";
  taxType: "pre" | "post";
  taxMethod: "manual" | "auto";
  taxState: TaxState;
  taxRate: string;
};

const emptyForm: IncomeForm = {
  source: "",
  amount: "",
  period: "monthly",
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
  if (taxState === "TX") return 0;
  if (taxState === "MA") return annualIncome * 0.05;
  return calculateProgressiveTax(annualIncome, CALIFORNIA_BRACKETS_ESTIMATE);
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
  amount: String(income.amount),
  period: "monthly",
  taxType: income.taxType,
  taxMethod: income.taxMethod,
  taxState: income.taxState ?? "TX",
  taxRate: String(income.taxRate),
});

export default function IncomePage() {
  const { incomes, addIncome, updateIncome, deleteIncome } = useBudget();
  const [form, setForm] = useState<IncomeForm>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
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

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    addIncome({
      source: form.source,
      amount: monthlyAmount,
      taxType: form.taxType,
      taxMethod: form.taxType === "pre" ? form.taxMethod : "manual",
      taxState: form.taxType === "pre" && form.taxMethod === "auto" ? form.taxState : null,
      taxRate: form.taxType === "pre" ? effectiveTaxRate : 0,
    });

    setForm(emptyForm);
  };

  const startEdit = (income: Income) => {
    setEditingId(income.id);
    setEditForm(toEditForm(income));
  };

  const saveEdit = () => {
    if (editingId === null) return;

    const monthlyEditAmount = Number(editForm.amount) || 0;
    const annualEditAmount = monthlyEditAmount * 12;
    const editAutoRate = getEffectiveTaxRate(annualEditAmount, editForm);
    const editEffectiveRate =
      editForm.taxType === "pre"
        ? editForm.taxMethod === "auto"
          ? editAutoRate
          : Number(editForm.taxRate) || 0
        : 0;

    updateIncome(editingId, {
      source: editForm.source,
      amount: monthlyEditAmount,
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

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <div className="mb-5 flex gap-4 text-sm">
        <Link href="/settings" className="text-zinc-600 hover:underline">
          Back to Settings
        </Link>
        <Link href="/" className="text-zinc-600 hover:underline">
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
                  <option value="CA">California</option>
                  <option value="TX">Texas</option>
                  <option value="MA">Massachusetts</option>
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
        <h2 className="mb-3 text-lg font-medium">Monthly Incomes</h2>
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
                            <option value="CA">California</option>
                            <option value="TX">Texas</option>
                            <option value="MA">Massachusetts</option>
                          </select>
                          <p className="text-sm text-zinc-700">
                            Estimated combined tax rate (federal + state):{" "}
                            {getAutoTaxBreakdown(
                              (Number(editForm.amount) || 0) * 12,
                              editForm.taxState,
                            ).combinedRate.toFixed(2)}
                            %
                          </p>
                          <p className="text-sm text-zinc-700">
                            Estimated federal tax rate:{" "}
                            {getAutoTaxBreakdown(
                              (Number(editForm.amount) || 0) * 12,
                              editForm.taxState,
                            ).federalRate.toFixed(2)}
                            %
                          </p>
                          <p className="text-sm text-zinc-700">
                            Estimated state tax rate:{" "}
                            {getAutoTaxBreakdown(
                              (Number(editForm.amount) || 0) * 12,
                              editForm.taxState,
                            ).stateRate.toFixed(2)}
                            %
                          </p>
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
                    Post-tax monthly value:{" "}
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
                    onClick={() => {
                      const shouldDelete = window.confirm(
                        "Delete this income source?",
                      );
                      if (!shouldDelete) return;
                      deleteIncome(income.id);
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
