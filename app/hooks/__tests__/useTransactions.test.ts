// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTransactions } from "../useTransactions";
import type { TransactionInput } from "@/lib/budget-types";

const makeInput = (overrides: Partial<TransactionInput> = {}): TransactionInput => ({
  amount: 42.5,
  categoryId: "cat-1",
  date: "2024-03-15",
  note: "Test note",
  isRecurring: false,
  recurrenceFrequency: "monthly",
  ...overrides,
});

const mockOk = () =>
  vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });

const mockFail = () =>
  vi.fn().mockResolvedValue({ ok: false, json: () => Promise.resolve({}) });

let authFetch: ReturnType<typeof vi.fn>;

beforeEach(() => {
  authFetch = vi.fn().mockResolvedValue(null);
});

// ── addTransaction ────────────────────────────────────────────────────────────

describe("addTransaction", () => {
  it("returns an error string when authFetch returns null", async () => {
    const { result } = renderHook(() => useTransactions(authFetch));
    let error: string | null = null;
    await act(async () => { error = await result.current.addTransaction(makeInput()); });
    expect(typeof error).toBe("string");
    expect(error).not.toBeNull();
  });

  it("returns an error string when the response is not ok", async () => {
    authFetch = mockFail();
    const { result } = renderHook(() => useTransactions(authFetch));
    let error: string | null = null;
    await act(async () => { error = await result.current.addTransaction(makeInput()); });
    expect(typeof error).toBe("string");
    expect(error).not.toBeNull();
  });

  it("returns null on success", async () => {
    authFetch = mockOk();
    const { result } = renderHook(() => useTransactions(authFetch));
    let error: string | null | undefined = undefined;
    await act(async () => { error = await result.current.addTransaction(makeInput()); });
    expect(error).toBeNull();
  });

  it("calls POST /api/transactions", async () => {
    authFetch = mockOk();
    const { result } = renderHook(() => useTransactions(authFetch));
    await act(async () => { await result.current.addTransaction(makeInput()); });
    expect(authFetch).toHaveBeenCalledWith(
      "/api/transactions",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("uppercases recurrenceFrequency in the request body", async () => {
    authFetch = mockOk();
    const { result } = renderHook(() => useTransactions(authFetch));
    await act(async () => {
      await result.current.addTransaction(
        makeInput({ isRecurring: true, recurrenceFrequency: "weekly" }),
      );
    });
    const body = JSON.parse(authFetch.mock.calls[0][1].body as string);
    expect(body.recurrenceFrequency).toBe("WEEKLY");
  });

  it("sets isRecurring to false when not explicitly true", async () => {
    authFetch = mockOk();
    const { result } = renderHook(() => useTransactions(authFetch));
    await act(async () => {
      await result.current.addTransaction(makeInput({ isRecurring: undefined }));
    });
    const body = JSON.parse(authFetch.mock.calls[0][1].body as string);
    expect(body.isRecurring).toBe(false);
  });

  it("sends description as null when note is empty", async () => {
    authFetch = mockOk();
    const { result } = renderHook(() => useTransactions(authFetch));
    await act(async () => {
      await result.current.addTransaction(makeInput({ note: "" }));
    });
    const body = JSON.parse(authFetch.mock.calls[0][1].body as string);
    expect(body.description).toBeNull();
  });
});

// ── updateTransaction ─────────────────────────────────────────────────────────

describe("updateTransaction", () => {
  it("returns false when authFetch returns null", async () => {
    const { result } = renderHook(() => useTransactions(authFetch));
    let ok: boolean | undefined;
    await act(async () => { ok = await result.current.updateTransaction("tx-1", makeInput()); });
    expect(ok).toBe(false);
  });

  it("returns false when response is not ok", async () => {
    authFetch = mockFail();
    const { result } = renderHook(() => useTransactions(authFetch));
    let ok: boolean | undefined;
    await act(async () => { ok = await result.current.updateTransaction("tx-1", makeInput()); });
    expect(ok).toBe(false);
  });

  it("returns true on success", async () => {
    authFetch = mockOk();
    const { result } = renderHook(() => useTransactions(authFetch));
    let ok: boolean | undefined;
    await act(async () => { ok = await result.current.updateTransaction("tx-1", makeInput()); });
    expect(ok).toBe(true);
  });

  it("calls PATCH on the correct transaction URL", async () => {
    authFetch = mockOk();
    const { result } = renderHook(() => useTransactions(authFetch));
    await act(async () => { await result.current.updateTransaction("tx-abc", makeInput()); });
    expect(authFetch).toHaveBeenCalledWith(
      "/api/transactions/tx-abc",
      expect.objectContaining({ method: "PATCH" }),
    );
  });

  it("uppercases the scope in the request body", async () => {
    authFetch = mockOk();
    const { result } = renderHook(() => useTransactions(authFetch));
    await act(async () => {
      await result.current.updateTransaction("tx-1", makeInput(), "future");
    });
    const body = JSON.parse(authFetch.mock.calls[0][1].body as string);
    expect(body.scope).toBe("FUTURE");
  });

  it("defaults scope to THIS", async () => {
    authFetch = mockOk();
    const { result } = renderHook(() => useTransactions(authFetch));
    await act(async () => { await result.current.updateTransaction("tx-1", makeInput()); });
    const body = JSON.parse(authFetch.mock.calls[0][1].body as string);
    expect(body.scope).toBe("THIS");
  });
});

// ── deleteTransaction ─────────────────────────────────────────────────────────

describe("deleteTransaction", () => {
  it("returns false when authFetch returns null", async () => {
    const { result } = renderHook(() => useTransactions(authFetch));
    let ok: boolean | undefined;
    await act(async () => { ok = await result.current.deleteTransaction("tx-1"); });
    expect(ok).toBe(false);
  });

  it("returns false when response is not ok", async () => {
    authFetch = mockFail();
    const { result } = renderHook(() => useTransactions(authFetch));
    let ok: boolean | undefined;
    await act(async () => { ok = await result.current.deleteTransaction("tx-1"); });
    expect(ok).toBe(false);
  });

  it("returns true on success", async () => {
    authFetch = mockOk();
    const { result } = renderHook(() => useTransactions(authFetch));
    let ok: boolean | undefined;
    await act(async () => { ok = await result.current.deleteTransaction("tx-1"); });
    expect(ok).toBe(true);
  });

  it("calls DELETE on the correct transaction URL", async () => {
    authFetch = mockOk();
    const { result } = renderHook(() => useTransactions(authFetch));
    await act(async () => { await result.current.deleteTransaction("tx-xyz"); });
    expect(authFetch).toHaveBeenCalledWith(
      "/api/transactions/tx-xyz",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("uppercases the scope in the request body", async () => {
    authFetch = mockOk();
    const { result } = renderHook(() => useTransactions(authFetch));
    await act(async () => { await result.current.deleteTransaction("tx-1", "all"); });
    const body = JSON.parse(authFetch.mock.calls[0][1].body as string);
    expect(body.scope).toBe("ALL");
  });

  it("defaults scope to THIS", async () => {
    authFetch = mockOk();
    const { result } = renderHook(() => useTransactions(authFetch));
    await act(async () => { await result.current.deleteTransaction("tx-1"); });
    const body = JSON.parse(authFetch.mock.calls[0][1].body as string);
    expect(body.scope).toBe("THIS");
  });
});
