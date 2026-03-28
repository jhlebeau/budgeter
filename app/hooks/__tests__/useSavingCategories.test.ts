// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSavingCategories } from "../useSavingCategories";

const makeCategory = (overrides = {}) => ({
  id: "scat-1",
  name: "Emergency Fund",
  limitType: "AMOUNT" as const,
  limitValue: 1000,
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

// ── addSavingCategory — validation ────────────────────────────────────────────

describe("addSavingCategory — client-side validation", () => {
  it("rejects invalid name characters", async () => {
    const { result } = renderHook(() => useSavingCategories(authFetch));
    let error: string | null = null;
    await act(async () => {
      error = await result.current.addSavingCategory("Fund & Savings", "amount", 100);
    });
    expect(error).not.toBeNull();
    expect(authFetch).not.toHaveBeenCalled();
  });

  it("rejects negative limitValue", async () => {
    const { result } = renderHook(() => useSavingCategories(authFetch));
    let error: string | null = null;
    await act(async () => {
      error = await result.current.addSavingCategory("Emergency", "amount", -1);
    });
    expect(error).not.toBeNull();
    expect(authFetch).not.toHaveBeenCalled();
  });

  it("rejects a duplicate name (case-insensitive)", async () => {
    authFetch = mockOk([makeCategory({ name: "Emergency Fund" })]);
    const { result } = renderHook(() => useSavingCategories(authFetch));
    await act(async () => { await result.current.refresh(); });

    authFetch = vi.fn();
    let error: string | null = null;
    await act(async () => {
      error = await result.current.addSavingCategory("emergency fund", "amount", 500);
    });
    expect(error).toMatch(/already exists/i);
    expect(authFetch).not.toHaveBeenCalled();
  });

  it("returns null and calls authFetch for a valid new category", async () => {
    const created = makeCategory({ id: "scat-new", name: "Vacation" });
    authFetch = mockOk(created);
    const { result } = renderHook(() => useSavingCategories(authFetch));
    let error: string | null | undefined = undefined;
    await act(async () => {
      error = await result.current.addSavingCategory("Vacation", "amount", 2000);
    });
    expect(error).toBeNull();
    expect(authFetch).toHaveBeenCalledWith("/api/saving-categories", expect.objectContaining({ method: "POST" }));
  });
});

// ── addSavingCategory — optimistic state update ───────────────────────────────

describe("addSavingCategory — optimistic state update", () => {
  it("prepends the new category to the list", async () => {
    const existing = makeCategory({ id: "scat-1", name: "Emergency Fund" });
    const created = makeCategory({ id: "scat-2", name: "Vacation" });

    authFetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([existing]) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(created) });

    const { result } = renderHook(() => useSavingCategories(authFetch));
    await act(async () => { await result.current.refresh(); });
    expect(result.current.savingCategories).toHaveLength(1);

    await act(async () => { await result.current.addSavingCategory("Vacation", "amount", 2000); });
    expect(result.current.savingCategories[0].name).toBe("Vacation");
    expect(result.current.savingCategories).toHaveLength(2);
  });
});

// ── updateSavingCategoryLimit ─────────────────────────────────────────────────

describe("updateSavingCategoryLimit", () => {
  it("skips the request when limitValue is negative", async () => {
    const { result } = renderHook(() => useSavingCategories(authFetch));
    await act(async () => { await result.current.updateSavingCategoryLimit("scat-1", "amount", -5); });
    expect(authFetch).not.toHaveBeenCalled();
  });

  it("updates matching category in state", async () => {
    const existing = makeCategory({ id: "scat-1", limitValue: 1000 });
    const updated = makeCategory({ id: "scat-1", limitValue: 2000 });

    authFetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([existing]) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(updated) });

    const { result } = renderHook(() => useSavingCategories(authFetch));
    await act(async () => { await result.current.refresh(); });
    await act(async () => { await result.current.updateSavingCategoryLimit("scat-1", "amount", 2000); });

    expect(result.current.savingCategories[0].limitValue).toBe(2000);
  });
});

// ── updateSavingCategoryName ──────────────────────────────────────────────────

describe("updateSavingCategoryName", () => {
  it("returns false for an invalid name", async () => {
    const { result } = renderHook(() => useSavingCategories(authFetch));
    let ok: boolean | undefined;
    await act(async () => { ok = await result.current.updateSavingCategoryName("scat-1", ""); });
    expect(ok).toBe(false);
    expect(authFetch).not.toHaveBeenCalled();
  });

  it("returns false when request fails", async () => {
    authFetch = mockFail();
    const { result } = renderHook(() => useSavingCategories(authFetch));
    let ok: boolean | undefined;
    await act(async () => { ok = await result.current.updateSavingCategoryName("scat-1", "Rainy Day"); });
    expect(ok).toBe(false);
  });

  it("returns true and updates state on success", async () => {
    const existing = makeCategory({ id: "scat-1", name: "Emergency Fund" });
    const updated = makeCategory({ id: "scat-1", name: "Rainy Day" });

    authFetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([existing]) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(updated) });

    const { result } = renderHook(() => useSavingCategories(authFetch));
    await act(async () => { await result.current.refresh(); });
    let ok: boolean | undefined;
    await act(async () => { ok = await result.current.updateSavingCategoryName("scat-1", "Rainy Day"); });

    expect(ok).toBe(true);
    expect(result.current.savingCategories[0].name).toBe("Rainy Day");
  });
});

// ── deleteSavingCategory ──────────────────────────────────────────────────────

describe("deleteSavingCategory", () => {
  it("removes the deleted category from state", async () => {
    const cat1 = makeCategory({ id: "scat-1", name: "Emergency Fund" });
    const cat2 = makeCategory({ id: "scat-2", name: "Vacation" });

    authFetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([cat1, cat2]) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });

    const { result } = renderHook(() => useSavingCategories(authFetch));
    await act(async () => { await result.current.refresh(); });
    expect(result.current.savingCategories).toHaveLength(2);

    await act(async () => { await result.current.deleteSavingCategory("scat-1"); });
    expect(result.current.savingCategories).toHaveLength(1);
    expect(result.current.savingCategories[0].id).toBe("scat-2");
  });

  it("does not modify state when request fails", async () => {
    authFetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([makeCategory()]) })
      .mockResolvedValueOnce({ ok: false });

    const { result } = renderHook(() => useSavingCategories(authFetch));
    await act(async () => { await result.current.refresh(); });
    await act(async () => { await result.current.deleteSavingCategory("scat-1"); });
    expect(result.current.savingCategories).toHaveLength(1);
  });
});

// ── clear ─────────────────────────────────────────────────────────────────────

describe("clear", () => {
  it("empties the saving categories list", async () => {
    authFetch = mockOk([makeCategory()]);
    const { result } = renderHook(() => useSavingCategories(authFetch));
    await act(async () => { await result.current.refresh(); });
    expect(result.current.savingCategories).toHaveLength(1);

    act(() => { result.current.clear(); });
    expect(result.current.savingCategories).toHaveLength(0);
  });
});
