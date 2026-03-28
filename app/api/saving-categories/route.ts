import { LimitType } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId, userExists } from "@/lib/api-user";
import {
  CATEGORY_NAME_MAX_LENGTH,
  ENTRY_NAME_ALLOWED_CHARACTERS_MESSAGE,
  isValidFiniteNumber,
  MAX_MONEY_VALUE,
  parseEntryName,
} from "@/lib/input-validation";

const isLimitType = (value: unknown): value is LimitType =>
  value === "AMOUNT" || value === "PERCENT";

export async function GET(request: Request) {
  const { userId, errorResponse } = await requireUserId();
  if (errorResponse || !userId) return errorResponse!;
  if (!(await userExists(userId))) {
    return NextResponse.json({ error: "User not found." }, { status: 401 });
  }

  const categories = await prisma.savingCategory.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(categories);
}

export async function POST(request: Request) {
  try {
    const { userId, errorResponse } = await requireUserId();
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

    const parsedName = parseEntryName(name, CATEGORY_NAME_MAX_LENGTH);
    const parsedLimitType = isLimitType(limitType) ? limitType : null;
    const parsedLimitValue = isValidFiniteNumber(limitValue, 0, MAX_MONEY_VALUE)
      ? (limitValue as number)
      : null;

    if (
      !parsedName ||
      !parsedLimitType ||
      parsedLimitValue === null ||
      (parsedLimitType === "PERCENT" && parsedLimitValue > 10_000)
    ) {
      return NextResponse.json(
        {
          error:
            `Invalid payload. Required: name, limitType (AMOUNT|PERCENT), limitValue (>=0). ${ENTRY_NAME_ALLOWED_CHARACTERS_MESSAGE}`,
        },
        { status: 400 },
      );
    }

    const category = await prisma.savingCategory.create({
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
      { error: "Unable to create saving category." },
      { status: 500 },
    );
  }
}
