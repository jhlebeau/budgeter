import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const normalizeUsername = (value: string) => value.trim().toLowerCase();
const hasWhitespace = (value: string) => /\s/.test(value);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username");
  if (!username || !username.trim()) {
    return NextResponse.json(
      { error: "username query param is required." },
      { status: 400 },
    );
  }
  if (hasWhitespace(username)) {
    return NextResponse.json(
      { error: "username cannot contain spaces." },
      { status: 400 },
    );
  }

  const usernameKey = normalizeUsername(username);
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

    if (typeof username !== "string" || !username.trim()) {
      return NextResponse.json(
        { error: "username is required." },
        { status: 400 },
      );
    }

    const trimmed = username.trim();
    if (hasWhitespace(trimmed)) {
      return NextResponse.json(
        { error: "username cannot contain spaces." },
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
