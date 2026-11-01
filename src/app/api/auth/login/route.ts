import { NextResponse } from "next/server";
import { z } from "zod";
import { createSessionToken, sessionCookie } from "@/core/auth/session";
import { rateLimit } from "@/core/http/rate-limit";

const LoginSchema = z.object({
  email: z.string().trim().email("Please provide a valid email address."),
  password: z.string().optional()
});

export async function POST(request: Request) {
  const limited = rateLimit(request, "auth_login", 20);
  if (limited) return limited;

  try {
    const raw = await request.json().catch(() => null);
    const parsed = LoginSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid login credentials." },
        { status: 400 }
      );
    }

    const { email } = parsed.data;
    const token = createSessionToken({
      email,
      role: email.includes("judge") ? "judge" : "owner"
    });

    const response = NextResponse.json({
      ok: true,
      user: {
        id: email,
        email,
        role: email.includes("judge") ? "judge" : "owner"
      }
    });

    response.cookies.set(sessionCookie(token));
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Authentication failed." },
      { status: 500 }
    );
  }
}

