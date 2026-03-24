import { Frequency } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId, userExists } from "@/lib/api-user";
import {
  isValidFiniteNumber,
  MAX_MONEY_VALUE,
  NAME_MAX_LENGTH,
  parseRequiredText,
} from "@/lib/input-validation";

const isFrequency = (value: unknown): value is Frequency =>
  value === "MONTHLY" || value === "ANNUAL";
const isTaxState = (value: unknown): value is "CA" | "TX" | "MA" =>
  value === "CA" || value === "TX" || value === "MA";

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

    if (name !== undefined && !parseRequiredText(name, NAME_MAX_LENGTH)) {
      return NextResponse.json(
        { error: "name must be a non-empty string up to 80 chars." },
        { status: 400 },
      );
    }
    if (amount !== undefined && !isValidFiniteNumber(amount, 0.01, MAX_MONEY_VALUE)) {
      return NextResponse.json(
        { error: "amount must be between 0.01 and 1,000,000,000." },
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
    if (taxRate !== undefined && !isValidFiniteNumber(taxRate, 0, 100)) {
      return NextResponse.json(
        { error: "taxRate must be between 0 and 100 when provided." },
        { status: 400 },
      );
    }
    if (taxState !== undefined && !isTaxState(taxState)) {
      return NextResponse.json(
        { error: "taxState must be one of: CA, TX, MA when provided." },
        { status: 400 },
      );
    }

    const current = await prisma.incomeSource.findFirst({ where: { id, userId } });
    if (!current) {
      return NextResponse.json({ error: "Income source not found." }, { status: 404 });
    }

    const parsedName = name !== undefined ? parseRequiredText(name, NAME_MAX_LENGTH) : undefined;
    const nextIsPreTax =
      typeof isPreTax === "boolean" ? isPreTax : current.isPreTax;

    const incomeSource = await prisma.incomeSource.update({
      where: { id },
      data: {
        ...(parsedName ? { name: parsedName } : {}),
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
