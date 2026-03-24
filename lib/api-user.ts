import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const getUserIdFromRequest = (request: Request) => {
  const userId = request.headers.get("x-user-id");
  if (!userId || !userId.trim()) return null;
  return userId;
};

export const requireUserId = (request: Request) => {
  const userId = getUserIdFromRequest(request);
  if (!userId) {
    return {
      userId: null,
      errorResponse: NextResponse.json(
        { error: "Missing user context." },
        { status: 401 },
      ),
    };
  }

  return { userId, errorResponse: null };
};

export const userExists = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  return Boolean(user);
};

