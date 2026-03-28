import { RateLimiterMemory, RateLimiterRes } from "rate-limiter-flexible";
import { NextResponse } from "next/server";

// 10 attempts per 15 minutes per IP, then blocked for the remainder of the window.
// Note: in-memory storage resets per serverless instance; adequate for a personal app
// without requiring external infrastructure.
const ipLimiter = new RateLimiterMemory({
  points: 10,
  duration: 15 * 60,
});

// 5 attempts per 15 minutes per username, to limit targeted attacks on a specific account.
const usernameLimiter = new RateLimiterMemory({
  points: 5,
  duration: 15 * 60,
});

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return "unknown";
}

function retryAfterSeconds(rateLimiterRes: RateLimiterRes): number {
  return Math.ceil(rateLimiterRes.msBeforeNext / 1000);
}

function tooManyRequestsResponse(retryAfter: number) {
  return NextResponse.json(
    { error: "Too many login attempts. Please try again later." },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfter) },
    },
  );
}

export async function checkLoginRateLimit(
  request: Request,
  username: string,
): Promise<{ limited: true; response: NextResponse } | { limited: false }> {
  const ip = getClientIp(request);

  try {
    await ipLimiter.consume(ip);
  } catch (err) {
    if (err instanceof RateLimiterRes) {
      return { limited: true, response: tooManyRequestsResponse(retryAfterSeconds(err)) };
    }
    throw err;
  }

  try {
    await usernameLimiter.consume(username);
  } catch (err) {
    if (err instanceof RateLimiterRes) {
      return { limited: true, response: tooManyRequestsResponse(retryAfterSeconds(err)) };
    }
    throw err;
  }

  return { limited: false };
}

export async function resetLoginRateLimit(request: Request, username: string) {
  const ip = getClientIp(request);
  await Promise.allSettled([
    ipLimiter.delete(ip),
    usernameLimiter.delete(username),
  ]);
}
