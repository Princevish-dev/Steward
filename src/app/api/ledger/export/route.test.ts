import { describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/ledger/export/route";
import * as domainStore from "@/core/domain/store";
import { createSessionToken, sessionCookie } from "@/core/auth/session";

describe("GET /api/ledger/export route security & validation", () => {
  it("returns 401 when session cookie is missing", async () => {
    const request = new Request("http://localhost:3000/api/ledger/export?mandateId=mdt_123");
    const response: Response = await GET(request);
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toContain("Authentication required");
  });

  it("returns 422 when mandateId is missing from query string", async () => {
    const token = createSessionToken("judge@example.com");
    const cookie = sessionCookie(token);

    const request = new Request("http://localhost:3000/api/ledger/export", {
      headers: { cookie: `${cookie.name}=${cookie.value}` }
    });
    const response: Response = await GET(request);
    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.error).toContain("mandateId is required");
  });

  it("returns 422 when format is unsupported", async () => {
    const token = createSessionToken("judge@example.com");
    const cookie = sessionCookie(token);

    const spy = vi.spyOn(domainStore, "getMandate").mockResolvedValue({
      id: "mdt_test",
      owner: "judge@example.com",
      status: "ACTIVE"
    } as any);

    try {
      const request = new Request("http://localhost:3000/api/ledger/export?mandateId=mdt_test&format=xml", {
        headers: { cookie: `${cookie.name}=${cookie.value}` }
      });
      const response: Response = await GET(request);
      expect(response.status).toBe(422);
      const body = await response.json();
      expect(body.error).toContain("Unsupported format");
    } finally {
      spy.mockRestore();
    }
  });

  it("returns 200 with CSV headers when format=csv is requested", async () => {
    const token = createSessionToken("judge@example.com");
    const cookie = sessionCookie(token);

    const spyMandate = vi.spyOn(domainStore, "getMandate").mockResolvedValue({
      id: "mdt_test",
      owner: "judge@example.com",
      status: "ACTIVE"
    } as any);

    const ledgerStore = await import("@/core/ledger/store");
    const spyLedger = vi.spyOn(ledgerStore, "readLedgerForMandate").mockResolvedValue([
      {
        sequence: 1,
        timestamp: "2026-11-01T20:00:00.000Z",
        type: "MANDATE_CREATED",
        runId: "system",
        mandateId: "mdt_test",
        payload: { owner: "judge@example.com" },
        prevHash: "0".repeat(64),
        entryHash: "a".repeat(64)
      }
    ]);

    try {
      const request = new Request("http://localhost:3000/api/ledger/export?mandateId=mdt_test&format=csv", {
        headers: { cookie: `${cookie.name}=${cookie.value}` }
      });
      const response: Response = await GET(request);
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("text/csv");
      expect(response.headers.get("content-disposition")).toContain("steward-ledger-mdt_test.csv");
      const text = await response.text();
      expect(text).toContain("sequence,timestamp,type,runId,mandateId,prevHash,entryHash,payload");
      expect(text).toContain("MANDATE_CREATED");
    } finally {
      spyMandate.mockRestore();
      spyLedger.mockRestore();
    }
  });

  it("returns 200 with JSON payload when format=json is requested", async () => {
    const token = createSessionToken("judge@example.com");
    const cookie = sessionCookie(token);

    const spyMandate = vi.spyOn(domainStore, "getMandate").mockResolvedValue({
      id: "mdt_test",
      owner: "judge@example.com",
      status: "ACTIVE"
    } as any);

    const ledgerStore = await import("@/core/ledger/store");
    const spyLedger = vi.spyOn(ledgerStore, "readLedgerForMandate").mockResolvedValue([
      {
        sequence: 1,
        timestamp: "2026-11-01T20:00:00.000Z",
        type: "MANDATE_CREATED",
        runId: "system",
        mandateId: "mdt_test",
        payload: { owner: "judge@example.com" },
        prevHash: "0".repeat(64),
        entryHash: "a".repeat(64)
      }
    ]);

    try {
      const request = new Request("http://localhost:3000/api/ledger/export?mandateId=mdt_test&format=json", {
        headers: { cookie: `${cookie.name}=${cookie.value}` }
      });
      const response: Response = await GET(request);
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("application/json");
      expect(response.headers.get("content-disposition")).toContain("steward-ledger-mdt_test.json");
      const json = await response.json();
      expect(json.mandateId).toBe("mdt_test");
      expect(json.count).toBe(1);
      expect(json.entries).toHaveLength(1);
    } finally {
      spyMandate.mockRestore();
      spyLedger.mockRestore();
    }
  });
});
