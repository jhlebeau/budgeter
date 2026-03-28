import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId, userExists } from "@/lib/api-user";

export async function GET() {
  const { userId, errorResponse } = await requireUserId();
  if (errorResponse || !userId) return errorResponse!;
  if (!(await userExists(userId))) {
    return NextResponse.json({ error: "User not found." }, { status: 401 });
  }

  const transactions = await prisma.transaction.findMany({
    where: { userId },
    select: { date: true },
    orderBy: { date: "desc" },
  });

  const months = new Set<string>();
  for (const t of transactions) {
    months.add(t.date.toISOString().slice(0, 7));
  }

  return NextResponse.json([...months].sort().reverse());
}
