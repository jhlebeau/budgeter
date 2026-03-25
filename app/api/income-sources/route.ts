import { Frequency, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId, userExists } from "@/lib/api-user";
import { TAX_STATES, TaxStateCode } from "@/lib/tax-states";
import { getCurrentMonthKey, isValidMonthKey } from "@/lib/month-utils";
import {
  isValidFiniteNumber,
  MAX_MONEY_VALUE,
  NAME_MAX_LENGTH,
  parseRequiredText,
} from "@/lib/input-validation";

const isFrequency = (value: unknown): value is Frequency =>
  value === "MONTHLY" || value === "ANNUAL";
const isTaxState = (value: unknown): value is TaxStateCode =>
  typeof value === "string" && TAX_STATES.includes(value as TaxStateCode);

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

    const parsedName = parseRequiredText(name, NAME_MAX_LENGTH);
    const parsedStartMonth = isValidMonthKey(startMonth)
      ? startMonth
      : getCurrentMonthKey();
    const parsedEndMonth =
      endMonth === null || endMonth === undefined
        ? null
        : isValidMonthKey(endMonth)
          ? endMonth
          : null;

    if (
      !parsedName ||
      !isValidFiniteNumber(amount, 0, MAX_MONEY_VALUE) ||
      !isFrequency(frequency) ||
      typeof isPreTax !== "boolean" ||
      (endMonth !== undefined && endMonth !== null && !isValidMonthKey(endMonth))
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid payload. Required: name, amount (>=0), frequency (MONTHLY|ANNUAL), isPreTax.",
        },
        { status: 400 },
      );
    }

    if (parsedEndMonth && parsedEndMonth < parsedStartMonth) {
      return NextResponse.json(
        { error: "endMonth cannot be earlier than startMonth." },
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

    const incomeSource = await prisma.incomeSource.create({
      data: {
        name: parsedName,
        amount,
        frequency,
        startMonth: parsedStartMonth,
        endMonth: parsedEndMonth,
        isPreTax,
        userId,
        taxRate: isPreTax ? (taxRate as number | undefined) : null,
        taxState: isPreTax ? (taxState as TaxStateCode | undefined) : null,
      },
    });

    return NextResponse.json(incomeSource, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientValidationError) {
      return NextResponse.json(
        {
          error:
            "Income payload is incompatible with current database schema. Run migrations and restart the dev server.",
        },
        { status: 500 },
      );
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "An income source with conflicting data already exists." },
        { status: 409 },
      );
    }

    console.error("POST /api/income-sources failed:", error);
    return NextResponse.json(
      { error: "Unable to create income source." },
      { status: 500 },
    );
  }
}
