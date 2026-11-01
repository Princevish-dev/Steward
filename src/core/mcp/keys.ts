import { createHash, randomBytes, randomUUID } from "node:crypto";
import { getDatabasePool } from "@/db/client";

export function hashMcpKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export function isMandateKeyScopedTo(keyMandateId: string, requestedMandateId: string): boolean {
  return keyMandateId === requestedMandateId;
}

export async function createMandateApiKey(mandateId: string) {
  const raw = `steward_${randomBytes(24).toString("base64url")}`;
  await getDatabasePool().query(
    `INSERT INTO mandate_api_keys (id, mandate_id, key_hash, key_prefix)
     VALUES ($1, $2, $3, $4)`,
    [randomUUID(), mandateId, hashMcpKey(raw), raw.slice(0, 16)]
  );
  return { key: raw, keyPrefix: raw.slice(0, 16), mandateId };
}

export async function authenticateMandateApiKey(raw: string, mandateId: string): Promise<boolean> {
  const result = await getDatabasePool().query(
    `SELECT 1 FROM mandate_api_keys
     WHERE key_hash = $1 AND mandate_id = $2 AND revoked_at IS NULL`,
    [hashMcpKey(raw), mandateId]
  );
  return result.rowCount === 1;
}

export async function getMandateForApiKey(raw: string): Promise<string | null> {
  const result = await getDatabasePool().query(
    "SELECT mandate_id FROM mandate_api_keys WHERE key_hash = $1 AND revoked_at IS NULL",
    [hashMcpKey(raw)]
  );
  return result.rows[0]?.mandate_id ?? null;
}
