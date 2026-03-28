// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useIncomes } from "../useIncomes";
import type { ApiIncome, IncomeInput } from "@/lib/budget-types";

const makeApiIncome = (overrides: Partial<ApiIncome> = {}): ApiIncome => ({
  id: "inc-1",
  name: "Salary",
  amount: 5000,
  frequency: "MONTHLY",
  startMonth: "2024-01",
  endMonth: null,
  isPreTax: false,
  taxRate: null,
  taxState: null,
  ...overrides,
});

const makeInput = (overrides: Partial<IncomeInput> = {}): IncomeInput => ({
  source: "Salary",
  amount: 5000,
  period: "monthly",
  startMonth: "2024-01",
  endMonth: null,
  taxType: "post",
  taxMethod: "manual",
  taxState: null,
  taxRate: 0,
  ...overrides,
});

const mockOk = (body: unknown) =>
  vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(body) });

const mockFail = () =>
  vi.fn().mockResolvedValue({ ok: false, json: () => Promise.resolve({}) });

let authFetch: ReturnType<typeof vi.fn>;

beforeEach(() => {
  authFetch = vi.fn().mockResolvedValue(null);
});

// ── addIncome — client-side validation ────────────────────────────────────────

describe("addIncome — client-side validation", () => {
  it("rejects a name with invalid characters", async () => {
    const { result } = renderHook(() => useIncomes(authFetch));
    let error: string | null = null;
    await act(async () => {
      error = await result.current.addIncome(makeInput({ source: "Salary & Bonus" }));
    });
    expect(error).not.toBeNull();
    expect(authFetch).not.toHaveBeenCalled();
  });

  it("rejects an empty name", async () => {
    const { result } = renderHook(() => useIncomes(authFetch));
    let error: string | null = null;
    await act(async () => {
      error = await result.current.addIncome(makeInput({ source: "   " }));
    });
    expect(error).not.toBeNull();
    expect(authFetch).not.toHaveBeenCalled();
  });

  it("rejects a duplicate name (case-insensitive)", async () => {
    authFetch = mockOk([makeApiIncome({ name: "Salary" })]);
    const { result } = renderHook(() => useIncomes(authFetch));
    await act(async () => { await result.current.refresh(); });

    authFetch = vi.fn();
    let error: string | null = null;
    await act(async () => {
      error = await result.current.addIncome(makeInput({ source: "salary" }));
    });
    expect(error).toMatch(/already exists/i);
    expect(authFetch).not.toHaveBeenCalled();
  });

  it("returns null and calls authFetch for a valid income source", async () => {
    authFetch = mockOk(makeApiIncome({ id: "inc-new", name: "Freelance" }));
    const { result } = renderHook(() => useIncomes(authFetch));
    let error: string | null | undefined = undefined;
    await act(async () => {
      error = await result.current.addIncome(makeInput({ source: "Freelance" }));
    });
    expect(error).toBeNull();
    expect(authFetch).toHaveBeenCalledWith(
      "/api/income-sources",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("returns an error string when authFetch returns null", async () => {
    authFetch = vi.fn().mockResolvedValue(null);
    const { result } = renderHook(() => useIncomes(authFetch));
    let error: string | null = null;
    await act(async () => {
      error = await result.current.addIncome(makeInput({ source: "Freelance" }));
    });
    expect(typeof error).toBe("string");
    expect(error).not.toBeNull();
  });

  it("returns an error string when the response is not ok", async () => {
    authFetch = mockFail();
    const { result } = renderHook(() => useIncomes(authFetch));
    let error: string | null = null;
    await act(async () => {
      error = await result.current.addIncome(makeInput({ source: "Freelance" }));
    });
    expect(typeof error).toBe("string");
    expect(error).not.toBeNull();
  });
});

// ── addIncome — optimistic state update ───────────────────────────────────────

describe("addIncome — state update", () => {
  it("prepends the new income source to the list", async () => {
    const existing = makeApiIncome({ id: "inc-1", name: "Salary" });
    const created = makeApiIncome({ id: "inc-2", name: "Freelance" });

    authFetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([existing]) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(created) });

    const { result } = renderHook(() => useIncomes(authFetch));
    await act(async () => { await result.current.refresh(); });
    expect(result.current.incomes).toHaveLength(1);

    await act(async () => { await result.current.addIncome(makeInput({ source: "Freelance" })); });
    expect(result.current.incomes[0].source).toBe("Freelance");
    expect(result.current.incomes).toHaveLength(2);
  });
});

// ── buildIncomePayload — branch logic ─────────────────────────────────────────

describe("buildIncomePayload — payload branches", () => {
  const getBody = () => JSON.parse(authFetch.mock.calls[0][1].body as string);

  it("sends isPreTax: false and omits taxRate/taxState for post-tax income", async () => {
    authFetch = mockOk(makeApiIncome());
    const { result } = renderHook(() => useIncomes(authFetch));
    await act(async () => {
      await result.current.addIncome(makeInput({ taxType: "post" }));
    });
    const body = getBody();
    expect(body.isPreTax).toBe(false);
    expect(body.taxRate).toBeUndefined();
    expect(body.taxState).toBeUndefined();
  });

  it("sends isPreTax: true and taxRate but no taxState for pre-tax manual", async () => {
    authFetch = mockOk(makeApiIncome({ isPreTax: true, taxRate: 0.22, taxState: null }));
    const { result } = renderHook(() => useIncomes(authFetch));
    await act(async () => {
      await result.current.addIncome(
        makeInput({ taxType: "pre", taxMethod: "manual", taxRate: 0.22, taxState: null }),
      );
    });
    const body = getBody();
    expect(body.isPreTax).toBe(true);
    expect(body.taxRate).toBe(0.22);
    expect(body.taxState).toBeUndefined();
  });

  it("sends taxState when pre-tax auto with a state code", async () => {
    authFetch = mockOk(makeApiIncome({ isPreTax: true, taxRate: 0.25, taxState: "CA" }));
    const { result } = renderHook(() => useIncomes(authFetch));
    await act(async () => {
      await result.current.addIncome(
        makeInput({ taxType: "pre", taxMethod: "auto", taxRate: 0.25, taxState: "CA" }),
      );
    });
    const body = getBody();
    expect(body.isPreTax).toBe(true);
    expect(body.taxRate).toBe(0.25);
    expect(body.taxState).toBe("CA");
  });

  it("sends frequency ANNUAL for annual period", async () => {
    authFetch = mockOk(makeApiIncome({ frequency: "ANNUAL", amount: 60000 }));
    const { result } = renderHook(() => useIncomes(authFetch));
    await act(async () => {
      await result.current.addIncome(makeInput({ period: "annual", amount: 60000 }));
    });
    const body = getBody();
    expect(body.frequency).toBe("ANNUAL");
  });

  it("sends frequency MONTHLY for monthly period", async () => {
    authFetch = mockOk(makeApiIncome());
    const { result } = renderHook(() => useIncomes(authFetch));
    await act(async () => {
      await result.current.addIncome(makeInput({ period: "monthly" }));
    });
    const body = getBody();
    expect(body.frequency).toBe("MONTHLY");
  });
});

// ── updateIncome ──────────────────────────────────────────────────────────────

describe("updateIncome", () => {
  it("returns false when authFetch returns null", async () => {
    authFetch = vi.fn().mockResolvedValue(null);
    const { result } = renderHook(() => useIncomes(authFetch));
    let ok: boolean | undefined;
    await act(async () => { ok = await result.current.updateIncome("inc-1", makeInput()); });
    expect(ok).toBe(false);
  });

  it("returns false when response is not ok", async () => {
    authFetch = mockFail();
    const { result } = renderHook(() => useIncomes(authFetch));
    let ok: boolean | undefined;
    await act(async () => { ok = await result.current.updateIncome("inc-1", makeInput()); });
    expect(ok).toBe(false);
  });

  it("returns true and updates the matching income in state", async () => {
    const original = makeApiIncome({ id: "inc-1", name: "Salary", amount: 5000 });
    const updated = makeApiIncome({ id: "inc-1", name: "Salary", amount: 6000 });

    authFetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([original]) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(updated) });

    const { result } = renderHook(() => useIncomes(authFetch));
    await act(async () => { await result.current.refresh(); });
    let ok: boolean | undefined;
    await act(async () => { ok = await result.current.updateIncome("inc-1", makeInput({ amount: 6000 })); });

    expect(ok).toBe(true);
    expect(result.current.incomes[0].amount).toBe(6000);
  });

  it("calls PATCH on the correct URL", async () => {
    authFetch = mockOk(makeApiIncome());
    const { result } = renderHook(() => useIncomes(authFetch));
    await act(async () => { await result.current.updateIncome("inc-1", makeInput()); });
    expect(authFetch).toHaveBeenCalledWith(
      "/api/income-sources/inc-1",
      expect.objectContaining({ method: "PATCH" }),
    );
  });
});

// ── deleteIncome ──────────────────────────────────────────────────────────────

describe("deleteIncome", () => {
  it("returns false when authFetch returns null", async () => {
    authFetch = vi.fn().mockResolvedValue(null);
    const { result } = renderHook(() => useIncomes(authFetch));
    let ok: boolean | undefined;
    await act(async () => { ok = await result.current.deleteIncome("inc-1"); });
    expect(ok).toBe(false);
  });

  it("returns false when response is not ok", async () => {
    authFetch = mockFail();
    const { result } = renderHook(() => useIncomes(authFetch));
    let ok: boolean | undefined;
    await act(async () => { ok = await result.current.deleteIncome("inc-1"); });
    expect(ok).toBe(false);
  });

  it("returns true and removes the income from state", async () => {
    const inc1 = makeApiIncome({ id: "inc-1", name: "Salary" });
    const inc2 = makeApiIncome({ id: "inc-2", name: "Freelance" });

    authFetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([inc1, inc2]) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });

    const { result } = renderHook(() => useIncomes(authFetch));
    await act(async () => { await result.current.refresh(); });
    expect(result.current.incomes).toHaveLength(2);

    let ok: boolean | undefined;
    await act(async () => { ok = await result.current.deleteIncome("inc-1"); });
    expect(ok).toBe(true);
    expect(result.current.incomes).toHaveLength(1);
    expect(result.current.incomes[0].id).toBe("inc-2");
  });

  it("does not modify state when request fails", async () => {
    authFetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([makeApiIncome()]) })
      .mockResolvedValueOnce({ ok: false });

    const { result } = renderHook(() => useIncomes(authFetch));
    await act(async () => { await result.current.refresh(); });
    await act(async () => { await result.current.deleteIncome("inc-1"); });
    expect(result.current.incomes).toHaveLength(1);
  });
});

// ── clear ─────────────────────────────────────────────────────────────────────

describe("clear", () => {
  it("empties the incomes list", async () => {
    authFetch = mockOk([makeApiIncome()]);
    const { result } = renderHook(() => useIncomes(authFetch));
    await act(async () => { await result.current.refresh(); });
    expect(result.current.incomes).toHaveLength(1);

    act(() => { result.current.clear(); });
    expect(result.current.incomes).toHaveLength(0);
  });
});
