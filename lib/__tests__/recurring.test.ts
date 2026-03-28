import { describe, it, expect } from "vitest";
import { generateRecurringDates, dateKey, toUtcDateOnly } from "../recurring";

// RecurrenceFrequency enum values (mirrors Prisma enum)
const DAILY = "DAILY" as const;
const WEEKLY = "WEEKLY" as const;
const MONTHLY = "MONTHLY" as const;

type Freq = typeof DAILY | typeof WEEKLY | typeof MONTHLY;

const d = (iso: string) => new Date(iso + "T00:00:00Z");
const keys = (dates: Date[]) => dates.map(dateKey);

// ── toUtcDateOnly ─────────────────────────────────────────────────────────────

describe("toUtcDateOnly", () => {
  it("strips time component", () => {
    const result = toUtcDateOnly(new Date("2026-03-15T18:45:00Z"));
    expect(result.toISOString()).toBe("2026-03-15T00:00:00.000Z");
  });

  it("preserves midnight UTC", () => {
    const result = toUtcDateOnly(new Date("2026-01-01T00:00:00Z"));
    expect(result.toISOString()).toBe("2026-01-01T00:00:00.000Z");
  });
});

// ── dateKey ───────────────────────────────────────────────────────────────────

describe("dateKey", () => {
  it("returns YYYY-MM-DD string", () => {
    expect(dateKey(d("2026-03-28"))).toBe("2026-03-28");
  });

  it("zero-pads month and day", () => {
    expect(dateKey(d("2026-01-05"))).toBe("2026-01-05");
  });
});

// ── generateRecurringDates ────────────────────────────────────────────────────

describe("generateRecurringDates — edge cases", () => {
  it("returns empty array when start is after end", () => {
    expect(generateRecurringDates(d("2026-03-10"), d("2026-03-01"), DAILY as Freq)).toEqual([]);
  });

  it("returns a single date when start equals end", () => {
    expect(keys(generateRecurringDates(d("2026-03-15"), d("2026-03-15"), DAILY as Freq))).toEqual(["2026-03-15"]);
  });
});

describe("generateRecurringDates — DAILY", () => {
  it("generates consecutive days", () => {
    const result = keys(generateRecurringDates(d("2026-03-01"), d("2026-03-05"), DAILY as Freq));
    expect(result).toEqual(["2026-03-01", "2026-03-02", "2026-03-03", "2026-03-04", "2026-03-05"]);
  });

  it("spans a month boundary", () => {
    const result = keys(generateRecurringDates(d("2026-01-30"), d("2026-02-02"), DAILY as Freq));
    expect(result).toEqual(["2026-01-30", "2026-01-31", "2026-02-01", "2026-02-02"]);
  });

  it("spans a year boundary", () => {
    const result = keys(generateRecurringDates(d("2025-12-30"), d("2026-01-02"), DAILY as Freq));
    expect(result).toEqual(["2025-12-30", "2025-12-31", "2026-01-01", "2026-01-02"]);
  });
});

describe("generateRecurringDates — WEEKLY", () => {
  it("generates dates 7 days apart", () => {
    const result = keys(generateRecurringDates(d("2026-03-01"), d("2026-03-22"), WEEKLY as Freq));
    expect(result).toEqual(["2026-03-01", "2026-03-08", "2026-03-15", "2026-03-22"]);
  });

  it("excludes a date that falls just outside end", () => {
    const result = keys(generateRecurringDates(d("2026-03-01"), d("2026-03-21"), WEEKLY as Freq));
    expect(result).toEqual(["2026-03-01", "2026-03-08", "2026-03-15"]);
  });

  it("spans a month boundary", () => {
    const result = keys(generateRecurringDates(d("2026-01-28"), d("2026-02-11"), WEEKLY as Freq));
    expect(result).toEqual(["2026-01-28", "2026-02-04", "2026-02-11"]);
  });
});

describe("generateRecurringDates — MONTHLY", () => {
  it("generates the same day each month", () => {
    const result = keys(generateRecurringDates(d("2026-01-15"), d("2026-04-15"), MONTHLY as Freq));
    expect(result).toEqual(["2026-01-15", "2026-02-15", "2026-03-15", "2026-04-15"]);
  });

  it("clamps Jan 31 → Feb 28 in a non-leap year", () => {
    const result = keys(generateRecurringDates(d("2026-01-31"), d("2026-03-31"), MONTHLY as Freq));
    expect(result).toEqual(["2026-01-31", "2026-02-28", "2026-03-31"]);
  });

  it("clamps Jan 31 → Feb 29 in a leap year", () => {
    const result = keys(generateRecurringDates(d("2024-01-31"), d("2024-03-31"), MONTHLY as Freq));
    expect(result).toEqual(["2024-01-31", "2024-02-29", "2024-03-31"]);
  });

  it("clamps Jan 30 → Feb 28 in a non-leap year", () => {
    const result = keys(generateRecurringDates(d("2026-01-30"), d("2026-03-30"), MONTHLY as Freq));
    expect(result).toEqual(["2026-01-30", "2026-02-28", "2026-03-30"]);
  });

  it("spans a year boundary", () => {
    const result = keys(generateRecurringDates(d("2025-11-15"), d("2026-02-15"), MONTHLY as Freq));
    expect(result).toEqual(["2025-11-15", "2025-12-15", "2026-01-15", "2026-02-15"]);
  });

  it("excludes a month that goes past end", () => {
    const result = keys(generateRecurringDates(d("2026-01-15"), d("2026-03-14"), MONTHLY as Freq));
    expect(result).toEqual(["2026-01-15", "2026-02-15"]);
  });

  it("single-occurrence when start equals end", () => {
    const result = keys(generateRecurringDates(d("2026-03-15"), d("2026-03-15"), MONTHLY as Freq));
    expect(result).toEqual(["2026-03-15"]);
  });

  it("Dec 31 clamps to Jan 31", () => {
    const result = keys(generateRecurringDates(d("2025-12-31"), d("2026-02-28"), MONTHLY as Freq));
    expect(result).toEqual(["2025-12-31", "2026-01-31", "2026-02-28"]);
  });
});
