import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId, userExists } from "@/lib/api-user";

export async function GET() {
  const { userId, errorResponse } = await requireUserId();
  if (errorResponse || !userId) return errorResponse!;
  if (!(await userExists(userId))) {
    return NextResponse.json({ error: "User not found." }, { status: 401 });
  }

  const series = await prisma.recurringTransaction.findMany({
    where: { userId },
    include: {
      category: { select: { id: true, name: true } },
      _count: { select: { transactions: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(series);
}
