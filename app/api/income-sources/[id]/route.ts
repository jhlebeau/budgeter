import { Frequency } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId, userExists } from "@/lib/api-user";
import { TAX_STATES, TaxStateCode } from "@/lib/tax-states";
import { isValidMonthKey } from "@/lib/month-utils";
import {
  ENTRY_NAME_ALLOWED_CHARACTERS_MESSAGE,
  isValidFiniteNumber,
  MAX_MONEY_VALUE,
  NAME_MAX_LENGTH,
  parseEntryName,
} from "@/lib/input-validation";

const isFrequency = (value: unknown): value is Frequency =>
  value === "MONTHLY" || value === "ANNUAL";
const isTaxState = (value: unknown): value is TaxStateCode =>
  typeof value === "string" && TAX_STATES.includes(value as TaxStateCode);

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
      startMonth,
      endMonth,
      isPreTax,
      taxRate,
      taxState,
    }: {
      name?: unknown;
      amount?: unknown;
      frequency?: unknown;
      startMonth?: unknown;
      endMonth?: unknown;
      isPreTax?: unknown;
      taxRate?: unknown;
      taxState?: unknown;
    } = body;

    if (name !== undefined && !parseEntryName(name, NAME_MAX_LENGTH)) {
      return NextResponse.json(
        {
          error: `name must be a non-empty string up to 80 chars. ${ENTRY_NAME_ALLOWED_CHARACTERS_MESSAGE}`,
        },
        { status: 400 },
      );
    }
    if (amount !== undefined && !isValidFiniteNumber(amount, 0, MAX_MONEY_VALUE)) {
      return NextResponse.json(
        { error: "amount must be between 0 and 1,000,000,000." },
        { status: 400 },
      );
    }
    if (frequency !== undefined && !isFrequency(frequency)) {
      return NextResponse.json(
        { error: "frequency must be MONTHLY or ANNUAL when provided." },
        { status: 400 },
      );
    }
    if (startMonth !== undefined && !isValidMonthKey(startMonth)) {
      return NextResponse.json(
        { error: "startMonth must be in YYYY-MM format when provided." },
        { status: 400 },
      );
    }
    if (
      endMonth !== undefined &&
      endMonth !== null &&
      !isValidMonthKey(endMonth)
    ) {
      return NextResponse.json(
        { error: "endMonth must be null or YYYY-MM when provided." },
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
        { error: "taxState is invalid." },
        { status: 400 },
      );
    }

    const current = await prisma.incomeSource.findFirst({ where: { id, userId } });
    if (!current) {
      return NextResponse.json({ error: "Income source not found." }, { status: 404 });
    }

    const parsedName = name !== undefined ? parseEntryName(name, NAME_MAX_LENGTH) : undefined;
    const parsedAmount = amount !== undefined ? (amount as number) : undefined;
    const parsedFrequency =
      frequency !== undefined ? (frequency as Frequency) : undefined;
    const parsedStartMonth =
      startMonth !== undefined ? (startMonth as string) : undefined;
    const parsedEndMonth =
      endMonth !== undefined ? (endMonth as string | null) : undefined;
    const parsedIsPreTax =
      isPreTax !== undefined ? (isPreTax as boolean) : undefined;
    const parsedTaxRate =
      taxRate !== undefined ? (taxRate as number) : undefined;
    const parsedTaxState =
      taxState !== undefined ? (taxState as TaxStateCode) : undefined;
    const nextStartMonth =
      startMonth !== undefined ? (startMonth as string) : current.startMonth;
    const nextEndMonth =
      endMonth !== undefined ? (endMonth as string | null) : current.endMonth;

    if (nextEndMonth && nextEndMonth < nextStartMonth) {
      return NextResponse.json(
        { error: "endMonth cannot be earlier than startMonth." },
        { status: 400 },
      );
    }
    const nextIsPreTax =
      typeof isPreTax === "boolean" ? isPreTax : current.isPreTax;

    const incomeSource = await prisma.incomeSource.update({
      where: { id },
      data: {
        ...(parsedName ? { name: parsedName } : {}),
        ...(parsedAmount !== undefined ? { amount: parsedAmount } : {}),
        ...(parsedFrequency !== undefined
          ? { frequency: parsedFrequency }
          : {}),
        ...(parsedStartMonth !== undefined
          ? { startMonth: parsedStartMonth }
          : {}),
        ...(parsedEndMonth !== undefined ? { endMonth: parsedEndMonth } : {}),
        ...(parsedIsPreTax !== undefined ? { isPreTax: parsedIsPreTax } : {}),
        ...(nextIsPreTax
          ? {
              ...(parsedTaxRate !== undefined ? { taxRate: parsedTaxRate } : {}),
              ...(parsedTaxState !== undefined
                ? { taxState: parsedTaxState }
                : {}),
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
