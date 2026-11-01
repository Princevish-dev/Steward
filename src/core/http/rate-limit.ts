const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(request: Request, scope: string, limit = 30): Response | null {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip") || "local";
  const key = `${scope}:${ip}`;
  const now = Date.now();
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + 60_000 });
    return null;
  }
  current.count += 1;
  if (current.count > limit) {
    return new Response(JSON.stringify({ error: "Rate limit exceeded." }), {
      status: 429,
      headers: { "content-type": "application/json", "retry-after": String(Math.ceil((current.resetAt - now) / 1000)) }
    });
  }
  return null;
}
