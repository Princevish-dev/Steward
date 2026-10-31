export type PayPalEnvironment = "SANDBOX" | "LIVE";

export type PayPalConfig = {
  environment: PayPalEnvironment;
  clientId: string;
  clientSecret: string;
};

const paypalApiBase = "https://api-m.sandbox.paypal.com";

export function getPayPalConfig(env: NodeJS.ProcessEnv = process.env): PayPalConfig {
  const environment = env.PAYPAL_ENVIRONMENT ?? "SANDBOX";
  if (environment !== "SANDBOX" && environment !== "LIVE") {
    throw new Error("PAYPAL_ENVIRONMENT must be SANDBOX or LIVE.");
  }
  if (!env.PAYPAL_CLIENT_ID || !env.PAYPAL_CLIENT_SECRET) {
    throw new Error("PayPal credentials are not configured.");
  }
  return {
    environment,
    clientId: env.PAYPAL_CLIENT_ID,
    clientSecret: env.PAYPAL_CLIENT_SECRET
  };
}

export async function getPayPalAccessToken(
  config = getPayPalConfig(),
  fetcher: typeof fetch = fetch
): Promise<string> {
  const credentials = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64");
  const response = await fetcher(`${paypalApiBase}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "grant_type=client_credentials"
  });

  if (!response.ok) {
    throw new Error(`PayPal OAuth failed with status ${response.status}.`);
  }

  const body: unknown = await response.json();
  if (!body || typeof body !== "object" || typeof (body as { access_token?: unknown }).access_token !== "string") {
    throw new Error("PayPal OAuth returned an invalid response.");
  }
  return (body as { access_token: string }).access_token;
}

export async function paypalRequest<T>(
  path: string,
  init: RequestInit = {},
  fetcher: typeof fetch = fetch
): Promise<T> {
  const config = getPayPalConfig();
  const accessToken = await getPayPalAccessToken(config, fetcher);
  const response = await fetcher(`${paypalApiBase}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {})
    }
  });

  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`PayPal request ${path} failed with status ${response.status}.`);
  }
  return body as T;
}

export { paypalApiBase };
