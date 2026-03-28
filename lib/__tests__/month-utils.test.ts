import { describe, it, expect } from "vitest";
import { isValidMonthKey, isMonthInRange } from "../month-utils";

// ── isValidMonthKey ───────────────────────────────────────────────────────────

describe("isValidMonthKey", () => {
  it("accepts valid month keys", () => {
    expect(isValidMonthKey("2026-01")).toBe(true);
    expect(isValidMonthKey("2026-12")).toBe(true);
    expect(isValidMonthKey("2026-06")).toBe(true);
    expect(isValidMonthKey("1999-03")).toBe(true);
  });

  it("rejects month 00", () => expect(isValidMonthKey("2026-00")).toBe(false));
  it("rejects month 13", () => expect(isValidMonthKey("2026-13")).toBe(false));
  it("rejects month 99", () => expect(isValidMonthKey("2026-99")).toBe(false));

  it("rejects missing leading zero on month", () => {
    expect(isValidMonthKey("2026-1")).toBe(false);
    expect(isValidMonthKey("2026-9")).toBe(false);
  });

  it("rejects wrong separator", () => {
    expect(isValidMonthKey("2026/03")).toBe(false);
    expect(isValidMonthKey("202603")).toBe(false);
    expect(isValidMonthKey("2026.03")).toBe(false);
  });

  it("rejects non-string types", () => {
    expect(isValidMonthKey(202603)).toBe(false);
    expect(isValidMonthKey(null)).toBe(false);
    expect(isValidMonthKey(undefined)).toBe(false);
    expect(isValidMonthKey({})).toBe(false);
  });

  it("rejects extra content around valid pattern", () => {
    expect(isValidMonthKey("2026-03-15")).toBe(false);
    expect(isValidMonthKey(" 2026-03")).toBe(false);
    expect(isValidMonthKey("2026-03 ")).toBe(false);
  });

  it("rejects empty string", () => expect(isValidMonthKey("")).toBe(false));
  it("rejects partial key", () => expect(isValidMonthKey("2026-")).toBe(false));
});

// ── isMonthInRange ────────────────────────────────────────────────────────────

describe("isMonthInRange", () => {
  it("returns true when month is between start and end (inclusive)", () => {
    expect(isMonthInRange("2026-03", "2026-01", "2026-12")).toBe(true);
  });

  it("returns true at the start boundary", () => {
    expect(isMonthInRange("2026-01", "2026-01", "2026-12")).toBe(true);
  });

  it("returns true at the end boundary", () => {
    expect(isMonthInRange("2026-12", "2026-01", "2026-12")).toBe(true);
  });

  it("returns false before start", () => {
    expect(isMonthInRange("2025-12", "2026-01", "2026-12")).toBe(false);
  });

  it("returns false after end", () => {
    expect(isMonthInRange("2027-01", "2026-01", "2026-12")).toBe(false);
  });

  it("returns true with null endMonth (open-ended)", () => {
    expect(isMonthInRange("2099-06", "2026-01", null)).toBe(true);
    expect(isMonthInRange("2026-01", "2026-01", null)).toBe(true);
  });

  it("returns false before start with null endMonth", () => {
    expect(isMonthInRange("2025-12", "2026-01", null)).toBe(false);
  });

  it("works across year boundaries", () => {
    expect(isMonthInRange("2026-01", "2025-11", "2026-03")).toBe(true);
    expect(isMonthInRange("2025-10", "2025-11", "2026-03")).toBe(false);
    expect(isMonthInRange("2026-04", "2025-11", "2026-03")).toBe(false);
  });

  it("handles single-month range", () => {
    expect(isMonthInRange("2026-03", "2026-03", "2026-03")).toBe(true);
    expect(isMonthInRange("2026-02", "2026-03", "2026-03")).toBe(false);
    expect(isMonthInRange("2026-04", "2026-03", "2026-03")).toBe(false);
  });
});
