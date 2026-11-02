import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSessionToken } from "@/core/auth/session";

const mocks = vi.hoisted(() => ({ resolveApproval: vi.fn(), confirmApprovalWithChallenge: vi.fn() }));
vi.mock("@/core/domain/store", () => ({ listApprovals: vi.fn(), resolveApproval: mocks.resolveApproval }));
vi.mock("@/core/approvals/typed-confirm", () => ({ confirmApprovalWithChallenge: mocks.confirmApprovalWithChallenge }));
import { PATCH } from "./route";

const request = (body: unknown) => new Request("http://localhost/api/approvals", {
  method: "PATCH",
  headers: { "content-type": "application/json", cookie: `steward_session=${createSessionToken("owner@example.com")}` },
  body: JSON.stringify(body)
});

describe("PATCH /api/approvals", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("FEATURE_TYPED_CONFIRM", "true");
  });

  it("rejects approval without a nonce and server-computed phrase", async () => {
    const response = await PATCH(request({ id: "approval-1", status: "APPROVED" }));
    expect(response.status).toBe(422);
    expect(mocks.resolveApproval).not.toHaveBeenCalled();
    expect(mocks.confirmApprovalWithChallenge).not.toHaveBeenCalled();
  });

  it("uses the session owner as reviewer and passes the typed one-time challenge", async () => {
    mocks.confirmApprovalWithChallenge.mockResolvedValue({ ok: true, approval: { id: "approval-1", status: "APPROVED" } });
    const response = await PATCH(request({
      id: "approval-1", status: "APPROVED", reviewer: "attacker", confirmation: { nonce: "nonce", phrase: "CONFIRM $18.50" }
    }));
    expect(response.status).toBe(200);
    expect(mocks.confirmApprovalWithChallenge).toHaveBeenCalledWith({
      approvalId: "approval-1", owner: "owner@example.com", nonce: "nonce", phrase: "CONFIRM $18.50", reviewer: "owner@example.com"
    });
  });

  it("rejects without requiring a typed approval phrase", async () => {
    mocks.resolveApproval.mockResolvedValue({ id: "approval-1", status: "REJECTED" });
    const response = await PATCH(request({ id: "approval-1", status: "REJECTED" }));
    expect(response.status).toBe(200);
    expect(mocks.resolveApproval).toHaveBeenCalledWith("approval-1", "REJECTED", "owner@example.com", "owner@example.com");
  });
});
