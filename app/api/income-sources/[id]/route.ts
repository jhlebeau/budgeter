import { Frequency } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId, userExists } from "@/lib/api-user";

const isFrequency = (value: unknown): value is Frequency =>
  value === "MONTHLY" || value === "ANNUAL";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { userId, errorResponse } = requireUserId(request);
  if (errorResponse || !userId) return errorResponse!;
  if (!(await userExists(userId))) {
    return NextResponse.json({ error: "User not found." }, { status: 401 });
  }

  const { id } = await context.params;
  const incomeSource = await prisma.incomeSource.findFirst({
    where: { id, userId },
  });

  if (!incomeSource) {
    return NextResponse.json({ error: "Income source not found." }, { status: 404 });
  }

  return NextResponse.json(incomeSource);
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { userId, errorResponse } = requireUserId(request);
    if (errorResponse || !userId) return errorResponse!;
    if (!(await userExists(userId))) {
      return NextResponse.json({ error: "User not found." }, { status: 401 });
    }

    const { id } = await context.params;
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

    if (name !== undefined && (typeof name !== "string" || !name.trim())) {
      return NextResponse.json(
        { error: "name must be a non-empty string when provided." },
        { status: 400 },
      );
    }
    if (amount !== undefined && (typeof amount !== "number" || amount <= 0)) {
      return NextResponse.json(
        { error: "amount must be a positive number when provided." },
        { status: 400 },
      );
    }
    if (frequency !== undefined && !isFrequency(frequency)) {
      return NextResponse.json(
        { error: "frequency must be MONTHLY or ANNUAL when provided." },
        { status: 400 },
      );
    }
    if (isPreTax !== undefined && typeof isPreTax !== "boolean") {
      return NextResponse.json(
        { error: "isPreTax must be a boolean when provided." },
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

    const current = await prisma.incomeSource.findFirst({ where: { id, userId } });
    if (!current) {
      return NextResponse.json({ error: "Income source not found." }, { status: 404 });
    }

    const nextIsPreTax =
      typeof isPreTax === "boolean" ? isPreTax : current.isPreTax;

    const incomeSource = await prisma.incomeSource.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name: name.trim() } : {}),
        ...(amount !== undefined ? { amount } : {}),
        ...(frequency !== undefined ? { frequency } : {}),
        ...(isPreTax !== undefined ? { isPreTax } : {}),
        ...(nextIsPreTax
          ? {
              ...(taxRate !== undefined ? { taxRate } : {}),
              ...(taxState !== undefined ? { taxState } : {}),
            }
          : { taxRate: null, taxState: null }),
      },
    });

    return NextResponse.json(incomeSource);
  } catch {
    return NextResponse.json(
      { error: "Unable to update income source." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { userId, errorResponse } = requireUserId(request);
  if (errorResponse || !userId) return errorResponse!;
  if (!(await userExists(userId))) {
    return NextResponse.json({ error: "User not found." }, { status: 401 });
  }

  const { id } = await context.params;
  const existing = await prisma.incomeSource.findFirst({ where: { id, userId } });

  if (!existing) {
    return NextResponse.json({ error: "Income source not found." }, { status: 404 });
  }

  await prisma.incomeSource.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
