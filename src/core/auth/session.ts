import { createHmac, timingSafeEqual } from "node:crypto";

export const COOKIE_NAME = "steward_session";

export interface SessionUser {
  id: string;
  email: string;
  role: string;
  name?: string;
}

export interface SessionPayload {
  owner: string;
  userId: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

const secret = () => {
  const configured = (process.env.SESSION_SECRET || process.env.NEXTAUTH_SECRET)?.trim();
  if (!configured && process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET is required in production.");
  }
  return configured || "steward-development-session-secret";
};

function sign(value: string): string {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

export function createSessionToken(
  userOrOwner: string | { id?: string; email: string; role?: string }
): string {
  const email = typeof userOrOwner === "string" ? userOrOwner : userOrOwner.email;
  const userId = typeof userOrOwner === "string" ? userOrOwner : (userOrOwner.id ?? userOrOwner.email);
  const role = typeof userOrOwner === "string" ? (email.includes("judge") ? "judge" : "owner") : (userOrOwner.role ?? "owner");
  const iat = Date.now();
  const exp = iat + 24 * 60 * 60 * 1000;
  const payload: SessionPayload = {
    owner: email,
    userId,
    email,
    role,
    iat,
    exp
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

export function readSession(request: Request): { user: SessionUser } | null {
  const header = request.headers.get("cookie") ?? "";
  const raw = header
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE_NAME}=`))
    ?.slice(COOKIE_NAME.length + 1);
  if (!raw) return null;
  const [payload, signature] = raw.split(".");
  if (!payload || !signature) return null;
  const expected = sign(payload);
  const valid = signature.length === expected.length && timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  if (!valid) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Partial<SessionPayload>;
    if (typeof parsed.exp !== "number" || parsed.exp <= Date.now()) return null;
    const email = typeof parsed.email === "string" ? parsed.email : (typeof parsed.owner === "string" ? parsed.owner : null);
    if (!email) return null;
    const userId = typeof parsed.userId === "string" ? parsed.userId : email;
    const role = typeof parsed.role === "string" ? parsed.role : (email.includes("judge") ? "judge" : "owner");
    return {
      user: {
        id: userId,
        email,
        role
      }
    };
  } catch {
    return null;
  }
}

export function readSessionOwner(request: Request): string | null {
  const session = readSession(request);
  return session ? session.user.email : null;
}

export function sessionCookie(token: string) {
  const isProd = process.env.NODE_ENV === "production";
  return {
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isProd,
    path: "/",
    maxAge: 86400,
    options: { httpOnly: true, sameSite: "lax", secure: isProd, path: "/", maxAge: 86400 }
  };
}

export function clearSessionCookie() {
  const isProd = process.env.NODE_ENV === "production";
  return {
    name: COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isProd,
    path: "/",
    maxAge: 0,
    options: { httpOnly: true, sameSite: "lax", secure: isProd, path: "/", maxAge: 0 }
  };
}

export function requireSessionOwner(request: Request): string {
  const owner = readSessionOwner(request);
  if (!owner) throw new Error("AUTH_REQUIRED");
  return owner;
}

export function requireSession(request: Request): { user: SessionUser } {
  const session = readSession(request);
  if (!session) throw new Error("AUTH_REQUIRED");
  return session;
}

export function ownsMandate(sessionOwner: string, mandateOwner: string): boolean {
  return sessionOwner === mandateOwner;
}
