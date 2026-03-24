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

    const parsedName = parseRequiredText(name, NAME_MAX_LENGTH);

    if (
      !parsedName ||
      !isValidFiniteNumber(amount, 0.01, MAX_MONEY_VALUE) ||
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

    const incomeSource = await prisma.incomeSource.create({
      data: {
        name: parsedName,
        amount,
        frequency,
        isPreTax,
        userId,
        taxRate: isPreTax ? (taxRate as number | undefined) : null,
        taxState: isPreTax ? (taxState as "CA" | "TX" | "MA" | undefined) : null,
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
