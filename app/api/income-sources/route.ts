import { Frequency } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId, userExists } from "@/lib/api-user";

const isFrequency = (value: unknown): value is Frequency =>
  value === "MONTHLY" || value === "ANNUAL";

export async function GET(request: Request) {
  const { userId, errorResponse } = requireUserId(request);
  if (errorResponse || !userId) return errorResponse!;
  if (!(await userExists(userId))) {
    return NextResponse.json({ error: "User not found." }, { status: 401 });
  }

  const incomeSources = await prisma.incomeSource.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(incomeSources);
}

export async function POST(request: Request) {
  try {
    const { userId, errorResponse } = requireUserId(request);
    if (errorResponse || !userId) return errorResponse!;
    if (!(await userExists(userId))) {
      return NextResponse.json({ error: "User not found." }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      amount,
      frequency,
      isPreTax,
      taxRate,
      taxState,
    }: {
      name?: unknown;
      amount?: unknown;
      frequency?: unknown;
      isPreTax?: unknown;
      taxRate?: unknown;
      taxState?: unknown;
    } = body;

    if (
      typeof name !== "string" ||
      !name.trim() ||
      typeof amount !== "number" ||
      amount <= 0 ||
      !isFrequency(frequency) ||
      typeof isPreTax !== "boolean"
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid payload. Required: name, amount (>0), frequency (MONTHLY|ANNUAL), isPreTax.",
        },
        { status: 400 },
      );
    }

    if (taxRate !== undefined && (typeof taxRate !== "number" || taxRate < 0)) {
      return NextResponse.json(
        { error: "taxRate must be a positive number when provided." },
        { status: 400 },
      );
    }

    if (taxState !== undefined && typeof taxState !== "string") {
      return NextResponse.json(
        { error: "taxState must be a string when provided." },
        { status: 400 },
      );
    }

    const incomeSource = await prisma.incomeSource.create({
      data: {
        name: name.trim(),
        amount,
        frequency,
        isPreTax,
        userId,
        taxRate: isPreTax ? (taxRate as number | undefined) : null,
        taxState: isPreTax ? (taxState as string | undefined) : null,
      },
    });

    return NextResponse.json(incomeSource, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Unable to create income source." },
      { status: 500 },
    );
  }
}
