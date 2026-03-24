import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  isValidUsername,
  normalizeUsername,
  parseRequiredText,
  USERNAME_MAX_LENGTH,
} from "@/lib/input-validation";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username");
  const parsedUsername = parseRequiredText(username, USERNAME_MAX_LENGTH);
  if (!parsedUsername) {
    return NextResponse.json(
      { error: "username query param is required." },
      { status: 400 },
    );
  }
  if (!isValidUsername(parsedUsername)) {
    return NextResponse.json(
      { error: "username must be alphanumeric only." },
      { status: 400 },
    );
  }

  const usernameKey = normalizeUsername(parsedUsername);
  const user = await prisma.user.findUnique({
    where: { usernameKey },
    select: { id: true, username: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  return NextResponse.json(user);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username }: { username?: unknown } = body;

    const trimmed = parseRequiredText(username, USERNAME_MAX_LENGTH);
    if (!trimmed) {
      return NextResponse.json(
        { error: "username is required." },
        { status: 400 },
      );
    }
    if (!isValidUsername(trimmed)) {
      return NextResponse.json(
        { error: "username must be alphanumeric only." },
        { status: 400 },
      );
    }

    const usernameKey = normalizeUsername(trimmed);
    const existing = await prisma.user.findUnique({
      where: { usernameKey },
      select: { id: true, username: true },
    });
    if (existing) {
      return NextResponse.json(
        { error: "A user with that username already exists." },
        { status: 409 },
      );
    }

    const created = await prisma.user.create({
      data: {
        username: trimmed,
        usernameKey,
      },
      select: { id: true, username: true },
    });
    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Unable to create user." }, { status: 500 });
  }
}
