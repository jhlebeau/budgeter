// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCategories } from "../useCategories";

const makeCategory = (overrides = {}) => ({
  id: "cat-1",
  name: "Groceries",
  limitType: "AMOUNT" as const,
  limitValue: 500,
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

// ── addCategory — validation ──────────────────────────────────────────────────

describe("addCategory — client-side validation", () => {
  it("rejects invalid name characters", async () => {
    const { result } = renderHook(() => useCategories(authFetch));
    let error: string | null = null;
    await act(async () => {
      error = await result.current.addCategory("Food & Drink", "amount", 100);
    });
    expect(error).not.toBeNull();
    expect(authFetch).not.toHaveBeenCalled();
  });

  it("rejects negative limitValue", async () => {
    const { result } = renderHook(() => useCategories(authFetch));
    let error: string | null = null;
    await act(async () => {
      error = await result.current.addCategory("Groceries", "amount", -1);
    });
    expect(error).not.toBeNull();
    expect(authFetch).not.toHaveBeenCalled();
  });

  it("rejects the reserved 'Unassigned' name (case-insensitive)", async () => {
    const { result } = renderHook(() => useCategories(authFetch));
    let error: string | null = null;
    await act(async () => {
      error = await result.current.addCategory("unassigned", "amount", 0);
    });
    expect(error).toMatch(/reserved/i);
    expect(authFetch).not.toHaveBeenCalled();
  });

  it("rejects a duplicate name (case-insensitive)", async () => {
    authFetch = mockOk([makeCategory({ name: "Groceries" })]);
    const { result } = renderHook(() => useCategories(authFetch));

    // Load initial state
    await act(async () => { await result.current.refresh(); });

    authFetch = vi.fn();
    let error: string | null = null;
    await act(async () => {
      error = await result.current.addCategory("groceries", "amount", 200);
    });
    expect(error).toMatch(/already exists/i);
    expect(authFetch).not.toHaveBeenCalled();
  });

  it("returns null and calls authFetch for a valid new category", async () => {
    const created = makeCategory({ id: "cat-new", name: "Transport" });
    authFetch = mockOk(created);
    const { result } = renderHook(() => useCategories(authFetch));
    let error: string | null | undefined = undefined;
    await act(async () => {
      error = await result.current.addCategory("Transport", "amount", 200);
    });
    expect(error).toBeNull();
    expect(authFetch).toHaveBeenCalledWith("/api/spending-categories", expect.objectContaining({ method: "POST" }));
  });
});

// ── addCategory — optimistic state update ─────────────────────────────────────

describe("addCategory — optimistic state update", () => {
  it("prepends the new category to the list", async () => {
    const existing = makeCategory({ id: "cat-1", name: "Groceries" });
    const created = makeCategory({ id: "cat-2", name: "Transport" });

    // First call: refresh. Second call: addCategory.
    authFetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([existing]) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(created) });

    const { result } = renderHook(() => useCategories(authFetch));
    await act(async () => { await result.current.refresh(); });
    expect(result.current.categories).toHaveLength(1);

    await act(async () => { await result.current.addCategory("Transport", "amount", 200); });
    expect(result.current.categories[0].name).toBe("Transport");
    expect(result.current.categories).toHaveLength(2);
  });
});

// ── updateCategoryLimit ───────────────────────────────────────────────────────

describe("updateCategoryLimit", () => {
  it("skips the request when limitValue is negative", async () => {
    const { result } = renderHook(() => useCategories(authFetch));
    await act(async () => { await result.current.updateCategoryLimit("cat-1", "amount", -5); });
    expect(authFetch).not.toHaveBeenCalled();
  });

  it("updates matching category in state", async () => {
    const existing = makeCategory({ id: "cat-1", name: "Groceries", limitValue: 500 });
    const updated = makeCategory({ id: "cat-1", name: "Groceries", limitValue: 750 });

    authFetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([existing]) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(updated) });

    const { result } = renderHook(() => useCategories(authFetch));
    await act(async () => { await result.current.refresh(); });
    await act(async () => { await result.current.updateCategoryLimit("cat-1", "amount", 750); });

    expect(result.current.categories[0].limitValue).toBe(750);
  });
});

// ── updateCategoryName ────────────────────────────────────────────────────────

describe("updateCategoryName", () => {
  it("returns false for an invalid name", async () => {
    const { result } = renderHook(() => useCategories(authFetch));
    let ok: boolean | undefined;
    await act(async () => { ok = await result.current.updateCategoryName("cat-1", ""); });
    expect(ok).toBe(false);
    expect(authFetch).not.toHaveBeenCalled();
  });

  it("returns false when request fails", async () => {
    authFetch = mockFail();
    const { result } = renderHook(() => useCategories(authFetch));
    let ok: boolean | undefined;
    await act(async () => { ok = await result.current.updateCategoryName("cat-1", "Valid Name"); });
    expect(ok).toBe(false);
  });

  it("returns true and updates state on success", async () => {
    const existing = makeCategory({ id: "cat-1", name: "Groceries" });
    const updated = makeCategory({ id: "cat-1", name: "Food" });

    authFetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([existing]) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(updated) });

    const { result } = renderHook(() => useCategories(authFetch));
    await act(async () => { await result.current.refresh(); });
    let ok: boolean | undefined;
    await act(async () => { ok = await result.current.updateCategoryName("cat-1", "Food"); });

    expect(ok).toBe(true);
    expect(result.current.categories[0].name).toBe("Food");
  });
});

// ── clear ─────────────────────────────────────────────────────────────────────

describe("clear", () => {
  it("empties the categories list", async () => {
    authFetch = mockOk([makeCategory()]);
    const { result } = renderHook(() => useCategories(authFetch));
    await act(async () => { await result.current.refresh(); });
    expect(result.current.categories).toHaveLength(1);

    act(() => { result.current.clear(); });
    expect(result.current.categories).toHaveLength(0);
  });
});
