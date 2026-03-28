import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId, userExists } from "@/lib/api-user";

const csvField = (value: string | number) => {
  const s = String(value);
  return s.includes(",") || s.includes('"') || s.includes("\n")
    ? `"${s.replace(/"/g, '""')}"`
    : s;
};

export async function GET() {
  const { userId, errorResponse } = await requireUserId();
  if (errorResponse || !userId) return errorResponse!;
  if (!(await userExists(userId))) {
    return NextResponse.json({ error: "User not found." }, { status: 401 });
  }

  const transactions = await prisma.transaction.findMany({
    where: { userId },
    include: { category: true },
    orderBy: { date: "desc" },
  });

  const header = "Date,Amount,Category,Note";
  const rows = transactions.map((t) => {
    const date = t.date.toISOString().slice(0, 10);
    const amount = t.amount.toFixed(2);
    const category = csvField(t.category.name);
    const note = csvField(t.description ?? "");
    return `${date},${amount},${category},${note}`;
  });

  const csv = [header, ...rows].join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": 'attachment; filename="transactions.csv"',
    },
  });
}
