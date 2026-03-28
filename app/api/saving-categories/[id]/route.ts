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

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { userId, errorResponse } = await requireUserId();
  if (errorResponse || !userId) return errorResponse!;
  if (!(await userExists(userId))) {
    return NextResponse.json({ error: "User not found." }, { status: 401 });
  }

  const { id } = await context.params;
  const category = await prisma.savingCategory.findFirst({ where: { id, userId } });

  if (!category) {
    return NextResponse.json(
      { error: "Saving category not found." },
      { status: 404 },
    );
  }

  return NextResponse.json(category);
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { userId, errorResponse } = await requireUserId();
    if (errorResponse || !userId) return errorResponse!;
    if (!(await userExists(userId))) {
      return NextResponse.json({ error: "User not found." }, { status: 401 });
    }

    const { id } = await context.params;
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

    if (name !== undefined && !parseEntryName(name, CATEGORY_NAME_MAX_LENGTH)) {
      return NextResponse.json(
        {
          error: `name must be a non-empty string up to 60 chars. ${ENTRY_NAME_ALLOWED_CHARACTERS_MESSAGE}`,
        },
        { status: 400 },
      );
    }
    if (limitType !== undefined && !isLimitType(limitType)) {
      return NextResponse.json(
        { error: "limitType must be AMOUNT or PERCENT when provided." },
        { status: 400 },
      );
    }
    if (
      limitValue !== undefined &&
      (!isValidFiniteNumber(limitValue, 0, MAX_MONEY_VALUE) ||
        (limitType === "PERCENT" && (limitValue as number) > 10_000))
    ) {
      return NextResponse.json(
        { error: "limitValue must be a non-negative number when provided." },
        { status: 400 },
      );
    }

    const existing = await prisma.savingCategory.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Saving category not found." },
        { status: 404 },
      );
    }
    const nextLimitType = (limitType ?? existing.limitType) as LimitType;
    if (
      limitValue !== undefined &&
      nextLimitType === "PERCENT" &&
      (limitValue as number) > 10_000
    ) {
      return NextResponse.json(
        { error: "Percent limit must be <= 10,000." },
        { status: 400 },
      );
    }

    const parsedName =
      name !== undefined ? parseEntryName(name, CATEGORY_NAME_MAX_LENGTH) : undefined;
    const parsedLimitType =
      limitType !== undefined ? (limitType as LimitType) : undefined;
    const parsedLimitValue =
      limitValue !== undefined ? (limitValue as number) : undefined;

    const category = await prisma.savingCategory.update({
      where: { id },
      data: {
        ...(parsedName ? { name: parsedName } : {}),
        ...(parsedLimitType !== undefined ? { limitType: parsedLimitType } : {}),
        ...(parsedLimitValue !== undefined ? { limitValue: parsedLimitValue } : {}),
      },
    });

    return NextResponse.json(category);
  } catch {
    return NextResponse.json(
      { error: "Unable to update saving category." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { userId, errorResponse } = await requireUserId();
  if (errorResponse || !userId) return errorResponse!;
  if (!(await userExists(userId))) {
    return NextResponse.json({ error: "User not found." }, { status: 401 });
  }

  const { id } = await context.params;
  const existing = await prisma.savingCategory.findFirst({ where: { id, userId } });

  if (!existing) {
    return NextResponse.json(
      { error: "Saving category not found." },
      { status: 404 },
    );
  }

  await prisma.savingCategory.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
