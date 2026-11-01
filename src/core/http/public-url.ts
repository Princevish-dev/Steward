export function getPublicBaseUrl(request: Request): string {
  const configured = process.env.APP_BASE_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");

  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  if (forwardedProto && forwardedHost) return `${forwardedProto}://${forwardedHost}`.replace(/\/+$/, "");

  if (process.env.NODE_ENV === "production") {
    console.error("APP_BASE_URL is missing in production; forwarded public URL headers are required.");
    throw new Error("Public base URL is not configured.");
  }

  return new URL(request.url).origin.replace(/\/+$/, "");
}
