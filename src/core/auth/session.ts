import { createHmac, timingSafeEqual } from "node:crypto";

const COOKIE_NAME = "steward_session";
const secret = () => {
  const configured = process.env.SESSION_SECRET?.trim();
  if (!configured && process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET is required in production.");
  }
  return configured || "steward-development-session-secret";
};

function sign(value: string): string {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

export function createSessionToken(owner: string): string {
  const payload = Buffer.from(JSON.stringify({ owner, exp: Date.now() + 24 * 60 * 60 * 1000 })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function readSessionOwner(request: Request): string | null {
  const header = request.headers.get("cookie") ?? "";
  const raw = header.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE_NAME}=`))?.slice(COOKIE_NAME.length + 1);
  if (!raw) return null;
  const [payload, signature] = raw.split(".");
  if (!payload || !signature) return null;
  const expected = sign(payload);
  const valid = signature.length === expected.length && timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  if (!valid) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { owner?: unknown; exp?: unknown };
    return typeof parsed.owner === "string" && typeof parsed.exp === "number" && parsed.exp > Date.now() ? parsed.owner : null;
  } catch {
    return null;
  }
}

export function sessionCookie(token: string): { name: string; value: string; options: Record<string, unknown> } {
  return {
    name: COOKIE_NAME,
    value: token,
    options: { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 86400 }
  };
}

export function requireSessionOwner(request: Request): string {
  const owner = readSessionOwner(request);
  if (!owner) throw new Error("AUTH_REQUIRED");
  return owner;
}

export function ownsMandate(sessionOwner: string, mandateOwner: string): boolean {
  return sessionOwner === mandateOwner;
}
