import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/api-user", () => ({
  requireUserId: vi.fn().mockResolvedValue({ userId: "user-1", errorResponse: null }),
  userExists: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    spendingCategory: {
      findFirst: vi.fn(),
    },
    transaction: {
      create: vi.fn(),
      createMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      aggregate: vi.fn(),
      findMany: vi.fn(),
    },
    recurringTransaction: {
      create: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn(),
    },
    recurringTransactionSkipDate: {
      findMany: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { POST } from "@/app/api/transactions/route";
import { prisma } from "@/lib/prisma";

const makeRequest = (body: unknown) =>
  new Request("http://localhost/api/transactions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

const validBody = {
  amount: 42.5,
  date: "2024-03-15",
  categoryId: "cat-abc123",
  isRecurring: false,
};

beforeEach(() => {
  // Default: category exists
  vi.mocked(prisma.spendingCategory.findFirst).mockResolvedValue({
    id: "cat-abc123",
    name: "Groceries",
    limitType: "AMOUNT",
    limitValue: 500,
    userId: "user-1",
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // Default: created transaction
  vi.mocked(prisma.transaction.create).mockResolvedValue({
    id: "tx-1",
    amount: 42.5,
    date: new Date("2024-03-15"),
    description: null,
    categoryId: "cat-abc123",
    userId: "user-1",
    recurringSeriesId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  vi.mocked(prisma.transaction.findUnique).mockResolvedValue({
    id: "tx-1",
    amount: 42.5,
    date: new Date("2024-03-15"),
    description: null,
    categoryId: "cat-abc123",
    userId: "user-1",
    recurringSeriesId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    category: { id: "cat-abc123", name: "Groceries", limitType: "AMOUNT", limitValue: 500, userId: "user-1", createdAt: new Date(), updatedAt: new Date() },
    recurringSeries: null,
  });

  vi.mocked(prisma.user.findUnique).mockResolvedValue({
    id: "user-1",
    username: "alice",
    passwordHash: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    recurringGeneratedDate: new Date(),
    rateLimitHits: 0,
    rateLimitResetAt: null,
  });

  vi.mocked(prisma.user.update).mockResolvedValue({} as any);
  vi.mocked(prisma.recurringTransaction.findMany).mockResolvedValue([]);
});

// ── 400 — amount validation ───────────────────────────────────────────────────

describe("POST /api/transactions — amount validation", () => {
  it("rejects a missing amount", async () => {
    const { amount: _, ...body } = validBody;
    const res = await POST(makeRequest(body));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/amount/i);
  });

  it("rejects a negative amount", async () => {
    const res = await POST(makeRequest({ ...validBody, amount: -1 }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/amount/i);
  });

  it("rejects a non-numeric amount", async () => {
    const res = await POST(makeRequest({ ...validBody, amount: "fifty" }));
    expect(res.status).toBe(400);
  });
});

// ── 400 — date validation ─────────────────────────────────────────────────────

describe("POST /api/transactions — date validation", () => {
  it("rejects a missing date", async () => {
    const { date: _, ...body } = validBody;
    const res = await POST(makeRequest(body));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/date/i);
  });

  it("rejects an invalid date string", async () => {
    const res = await POST(makeRequest({ ...validBody, date: "not-a-date" }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/date/i);
  });
});

// ── 400 — categoryId validation ───────────────────────────────────────────────

describe("POST /api/transactions — categoryId validation", () => {
  it("rejects a missing categoryId", async () => {
    const { categoryId: _, ...body } = validBody;
    const res = await POST(makeRequest(body));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/categoryId/i);
  });

  it("rejects a categoryId with invalid format (special chars)", async () => {
    const res = await POST(makeRequest({ ...validBody, categoryId: "bad id!" }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/categoryId/i);
  });

  it("returns 400 when category does not exist in the database", async () => {
    vi.mocked(prisma.spendingCategory.findFirst).mockResolvedValue(null);
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/category does not exist/i);
  });
});

// ── 400 — recurring frequency validation ─────────────────────────────────────

describe("POST /api/transactions — recurrenceFrequency validation", () => {
  it("rejects isRecurring=true with no recurrenceFrequency", async () => {
    const res = await POST(makeRequest({ ...validBody, isRecurring: true }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/recurrenceFrequency/i);
  });

  it("rejects isRecurring=true with an invalid frequency value", async () => {
    const res = await POST(
      makeRequest({ ...validBody, isRecurring: true, recurrenceFrequency: "YEARLY" }),
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/recurrenceFrequency/i);
  });
});

// ── 201 — valid payload ───────────────────────────────────────────────────────

describe("POST /api/transactions — 201 success", () => {
  it("creates a one-off transaction and returns 201", async () => {
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(201);
    expect(vi.mocked(prisma.transaction.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          amount: 42.5,
          categoryId: "cat-abc123",
          userId: "user-1",
        }),
      }),
    );
  });

  it("accepts amount of 0", async () => {
    const res = await POST(makeRequest({ ...validBody, amount: 0 }));
    expect(res.status).toBe(201);
  });
});
