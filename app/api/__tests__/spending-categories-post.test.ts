import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/api-user", () => ({
  requireUserId: vi.fn().mockResolvedValue({ userId: "user-1", errorResponse: null }),
  userExists: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    spendingCategory: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

import { POST } from "@/app/api/spending-categories/route";
import { prisma } from "@/lib/prisma";

const makeRequest = (body: unknown) =>
  new Request("http://localhost/api/spending-categories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  vi.mocked(prisma.spendingCategory.create).mockResolvedValue({
    id: "cat-1",
    name: "Groceries",
    limitType: "AMOUNT",
    limitValue: 500,
    userId: "user-1",
    createdAt: new Date(),
    updatedAt: new Date(),
  });
});

// ── 400 — input validation ────────────────────────────────────────────────────

describe("POST /api/spending-categories — 400 validation", () => {
  it("rejects a missing name", async () => {
    const res = await POST(makeRequest({ limitType: "AMOUNT", limitValue: 100 }));
    expect(res.status).toBe(400);
  });

  it("rejects a name with invalid characters", async () => {
    const res = await POST(makeRequest({ name: "Food & Drink", limitType: "AMOUNT", limitValue: 100 }));
    expect(res.status).toBe(400);
  });

  it("rejects the reserved 'Unassigned' name", async () => {
    const res = await POST(makeRequest({ name: "Unassigned", limitType: "AMOUNT", limitValue: 0 }));
    expect(res.status).toBe(400);
  });

  it("rejects an invalid limitType", async () => {
    const res = await POST(makeRequest({ name: "Groceries", limitType: "FIXED", limitValue: 100 }));
    expect(res.status).toBe(400);
  });

  it("rejects a missing limitValue", async () => {
    const res = await POST(makeRequest({ name: "Groceries", limitType: "AMOUNT" }));
    expect(res.status).toBe(400);
  });

  it("rejects a negative limitValue", async () => {
    const res = await POST(makeRequest({ name: "Groceries", limitType: "AMOUNT", limitValue: -1 }));
    expect(res.status).toBe(400);
  });

  it("rejects PERCENT limitType with limitValue > 10000", async () => {
    const res = await POST(makeRequest({ name: "Groceries", limitType: "PERCENT", limitValue: 10001 }));
    expect(res.status).toBe(400);
  });
});

// ── 201 — valid payload ───────────────────────────────────────────────────────

describe("POST /api/spending-categories — 201 success", () => {
  it("creates the category and returns 201", async () => {
    const res = await POST(makeRequest({ name: "Groceries", limitType: "AMOUNT", limitValue: 500 }));
    expect(res.status).toBe(201);
    expect(vi.mocked(prisma.spendingCategory.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: "Groceries",
          limitType: "AMOUNT",
          limitValue: 500,
          userId: "user-1",
        }),
      }),
    );
  });

  it("accepts PERCENT limitType with limitValue <= 10000", async () => {
    const res = await POST(makeRequest({ name: "Savings", limitType: "PERCENT", limitValue: 20 }));
    expect(res.status).toBe(201);
  });
});
