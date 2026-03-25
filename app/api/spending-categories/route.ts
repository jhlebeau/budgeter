import { LimitType } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId, userExists } from "@/lib/api-user";
import {
  ensureUnassignedSpendingCategory,
  isUnassignedCategoryName,
} from "@/lib/spending-category";
import {
  CATEGORY_NAME_MAX_LENGTH,
  isValidFiniteNumber,
  MAX_MONEY_VALUE,
  parseRequiredText,
} from "@/lib/input-validation";

const isLimitType = (value: unknown): value is LimitType =>
  value === "AMOUNT" || value === "PERCENT";

export async function GET(request: Request) {
  const { userId, errorResponse } = requireUserId(request);
  if (errorResponse || !userId) return errorResponse!;
  if (!(await userExists(userId))) {
    return NextResponse.json({ error: "User not found." }, { status: 401 });
  }

  await ensureUnassignedSpendingCategory(userId);
  const categories = await prisma.spendingCategory.findMany({
    where: { userId },
    include: { transactions: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(categories);
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
      limitType,
      limitValue,
    }: {
      name?: unknown;
      limitType?: unknown;
      limitValue?: unknown;
    } = body;

    const parsedName = parseRequiredText(name, CATEGORY_NAME_MAX_LENGTH);
    const parsedLimitType = isLimitType(limitType) ? limitType : null;
    const parsedLimitValue = isValidFiniteNumber(limitValue, 0, MAX_MONEY_VALUE)
      ? (limitValue as number)
      : null;

    if (
      !parsedName ||
      !parsedLimitType ||
      parsedLimitValue === null ||
      isUnassignedCategoryName(parsedName) ||
      (parsedLimitType === "PERCENT" && parsedLimitValue > 10_000)
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid payload. name cannot be Unassigned. Required: name, limitType (AMOUNT|PERCENT), limitValue (>=0).",
        },
        { status: 400 },
      );
    }

    const category = await prisma.spendingCategory.create({
      data: {
        name: parsedName,
        userId,
        limitType: parsedLimitType,
        limitValue: parsedLimitValue,
      },
    });

    return NextResponse.json(category, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Unable to create spending category." },
      { status: 500 },
    );
  }
}
