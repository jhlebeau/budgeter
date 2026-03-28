import { describe, it, expect, vi, afterEach } from "vitest";
import { toIncome, toTransaction } from "../budget-types";
import type { ApiIncome, ApiTransaction } from "../budget-types";

// ── toIncome ──────────────────────────────────────────────────────────────────

const baseApiIncome = (): ApiIncome => ({
  id: "inc-1",
  name: "Salary",
  amount: 6000,
  frequency: "MONTHLY",
  startMonth: "2026-01",
  endMonth: null,
  isPreTax: false,
  taxRate: null,
  taxState: null,
});

describe("toIncome — post-tax monthly", () => {
  it("sets period to monthly", () => {
    expect(toIncome(baseApiIncome()).period).toBe("monthly");
  });

  it("amount equals input amount for monthly", () => {
    const result = toIncome(baseApiIncome());
    expect(result.amount).toBe(6000);
    expect(result.inputAmount).toBe(6000);
  });

  it("postTaxAmount equals amount for post-tax income", () => {
    const result = toIncome(baseApiIncome());
    expect(result.postTaxAmount).toBe(6000);
  });

  it("taxType is post", () => {
    expect(toIncome(baseApiIncome()).taxType).toBe("post");
  });

  it("taxRate is 0 for post-tax income", () => {
    expect(toIncome(baseApiIncome()).taxRate).toBe(0);
  });

  it("taxMethod is manual", () => {
    expect(toIncome(baseApiIncome()).taxMethod).toBe("manual");
  });

  it("passes through startMonth and endMonth", () => {
    const result = toIncome(baseApiIncome());
    expect(result.startMonth).toBe("2026-01");
    expect(result.endMonth).toBeNull();
  });
});

describe("toIncome — annual income", () => {
  it("divides annual amount by 12 for monthly amount", () => {
    const income = { ...baseApiIncome(), amount: 120000, frequency: "ANNUAL" as const };
    expect(toIncome(income).amount).toBe(10000);
  });

  it("preserves inputAmount as the raw annual figure", () => {
    const income = { ...baseApiIncome(), amount: 120000, frequency: "ANNUAL" as const };
    expect(toIncome(income).inputAmount).toBe(120000);
  });

  it("sets period to annual", () => {
    const income = { ...baseApiIncome(), frequency: "ANNUAL" as const };
    expect(toIncome(income).period).toBe("annual");
  });
});

describe("toIncome — pre-tax with manual rate", () => {
  it("applies tax rate to compute postTaxAmount", () => {
    const income = { ...baseApiIncome(), isPreTax: true, taxRate: 25, taxState: null };
    const result = toIncome(income);
    expect(result.postTaxAmount).toBe(6000 * 0.75);
  });

  it("taxType is pre", () => {
    const income = { ...baseApiIncome(), isPreTax: true, taxRate: 20, taxState: null };
    expect(toIncome(income).taxType).toBe("pre");
  });

  it("taxMethod is manual when taxState is null", () => {
    const income = { ...baseApiIncome(), isPreTax: true, taxRate: 20, taxState: null };
    expect(toIncome(income).taxMethod).toBe("manual");
  });

  it("defaults to 0% tax when taxRate is null on pre-tax income", () => {
    const income = { ...baseApiIncome(), isPreTax: true, taxRate: null, taxState: null };
    const result = toIncome(income);
    expect(result.taxRate).toBe(0);
    expect(result.postTaxAmount).toBe(6000);
  });
});

describe("toIncome — pre-tax with auto (state-based) rate", () => {
  it("taxMethod is auto when taxState is provided", () => {
    const income = { ...baseApiIncome(), isPreTax: true, taxRate: 22, taxState: "CA" as const };
    expect(toIncome(income).taxMethod).toBe("auto");
  });

  it("applies the provided taxRate regardless of method", () => {
    const income = { ...baseApiIncome(), isPreTax: true, taxRate: 30, taxState: "NY" as const };
    expect(toIncome(income).postTaxAmount).toBe(6000 * 0.70);
  });
});

describe("toIncome — annual pre-tax", () => {
  it("applies tax to the monthly derived amount", () => {
    const income = {
      ...baseApiIncome(),
      amount: 120000,
      frequency: "ANNUAL" as const,
      isPreTax: true,
      taxRate: 25,
      taxState: null,
    };
    const result = toIncome(income);
    expect(result.amount).toBe(10000);
    expect(result.postTaxAmount).toBe(10000 * 0.75);
  });
});

// ── toTransaction ─────────────────────────────────────────────────────────────

const baseApiTransaction = (): ApiTransaction => ({
  id: "txn-1",
  amount: 42.5,
  date: "2026-03-15T00:00:00.000Z",
  description: "Groceries",
  categoryId: "cat-1",
  category: { id: "cat-1", name: "Food" },
  recurringSeries: null,
});

describe("toTransaction — non-recurring", () => {
  it("maps basic fields", () => {
    const result = toTransaction(baseApiTransaction());
    expect(result.id).toBe("txn-1");
    expect(result.amount).toBe(42.5);
    expect(result.categoryId).toBe("cat-1");
    expect(result.categoryName).toBe("Food");
    expect(result.note).toBe("Groceries");
  });

  it("slices date to YYYY-MM-DD", () => {
    expect(toTransaction(baseApiTransaction()).date).toBe("2026-03-15");
  });

  it("null description maps to empty string", () => {
    const t = { ...baseApiTransaction(), description: null };
    expect(toTransaction(t).note).toBe("");
  });

  it("recurringSeriesId is null", () => {
    expect(toTransaction(baseApiTransaction()).recurringSeriesId).toBeNull();
  });

  it("recurrenceFrequency is null", () => {
    expect(toTransaction(baseApiTransaction()).recurrenceFrequency).toBeNull();
  });

  it("recurringSeriesStatus is null", () => {
    expect(toTransaction(baseApiTransaction()).recurringSeriesStatus).toBeNull();
  });
});

describe("toTransaction — active recurring series", () => {
  afterEach(() => vi.useRealTimers());

  const withActiveSeries = (): ApiTransaction => ({
    ...baseApiTransaction(),
    recurringSeries: { id: "series-1", frequency: "MONTHLY", endDate: null },
  });

  it("recurringSeriesId is set", () => {
    expect(toTransaction(withActiveSeries()).recurringSeriesId).toBe("series-1");
  });

  it("recurrenceFrequency maps MONTHLY → monthly", () => {
    expect(toTransaction(withActiveSeries()).recurrenceFrequency).toBe("monthly");
  });

  it("recurrenceFrequency maps WEEKLY → weekly", () => {
    const t = { ...withActiveSeries(), recurringSeries: { id: "s", frequency: "WEEKLY" as const, endDate: null } };
    expect(toTransaction(t).recurrenceFrequency).toBe("weekly");
  });

  it("recurrenceFrequency maps DAILY → daily", () => {
    const t = { ...withActiveSeries(), recurringSeries: { id: "s", frequency: "DAILY" as const, endDate: null } };
    expect(toTransaction(t).recurrenceFrequency).toBe("daily");
  });

  it("status is active when endDate is null", () => {
    expect(toTransaction(withActiveSeries()).recurringSeriesStatus).toBe("active");
  });

  it("status is active when endDate is in the future", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-15T12:00:00Z"));
    const t: ApiTransaction = {
      ...baseApiTransaction(),
      recurringSeries: { id: "s", frequency: "MONTHLY", endDate: "2026-12-31T00:00:00.000Z" },
    };
    expect(toTransaction(t).recurringSeriesStatus).toBe("active");
  });

  it("status is paused when endDate is in the past", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-15T12:00:00Z"));
    const t: ApiTransaction = {
      ...baseApiTransaction(),
      recurringSeries: { id: "s", frequency: "MONTHLY", endDate: "2026-01-01T00:00:00.000Z" },
    };
    expect(toTransaction(t).recurringSeriesStatus).toBe("paused");
  });
});

