import { prisma } from "@/lib/prisma";
import { UNASSIGNED_CATEGORY_NAME } from "@/lib/spending-category-constants";

export const isUnassignedCategoryName = (name: string) =>
  name.trim().toLowerCase() === UNASSIGNED_CATEGORY_NAME.toLowerCase();

export async function ensureUnassignedSpendingCategory(userId: string) {
  const existing = await prisma.spendingCategory.findFirst({
    where: {
      userId,
      name: UNASSIGNED_CATEGORY_NAME,
    },
  });
  if (existing) return existing;

  return prisma.spendingCategory.create({
    data: {
      userId,
      name: UNASSIGNED_CATEGORY_NAME,
      limitType: "AMOUNT",
      limitValue: 0,
    },
  });
}
