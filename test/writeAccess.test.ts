import { describe, expect, it } from "bun:test";
import { ensureActorHasWriteAccess } from "../src/lib/writeAccess";

const never = async (): Promise<string> => {
  throw new Error("fetchPermission should not be called");
};

describe("ensureActorHasWriteAccess", () => {
  it("rejects when the actor is unknown", async () => {
    const r = await ensureActorHasWriteAccess({
      actor: undefined,
      allowUsers: "",
      allowBots: "",
      fetchPermission: never,
    });
    expect(r.status).toBe("rejected");
  });

  it("approves any user with allow-users='*' (no API call)", async () => {
    const r = await ensureActorHasWriteAccess({
      actor: "stranger",
      allowUsers: "*",
      allowBots: "",
      fetchPermission: never,
    });
    expect(r.status).toBe("approved");
  });

  it("approves an explicitly allow-listed user case-insensitively", async () => {
    const r = await ensureActorHasWriteAccess({
      actor: "Alice",
      allowUsers: "bob, alice",
      allowBots: "",
      fetchPermission: never,
    });
    expect(r.status).toBe("approved");
  });

  it("approves an allow-listed bot but rejects others", async () => {
    const ok = await ensureActorHasWriteAccess({
      actor: "dependabot[bot]",
      allowUsers: "",
      allowBots: "*",
      fetchPermission: never,
    });
    expect(ok.status).toBe("approved");

    const denied = await ensureActorHasWriteAccess({
      actor: "evil[bot]",
      allowUsers: "",
      allowBots: "dependabot[bot]",
      fetchPermission: never,
    });
    expect(denied.status).toBe("rejected");
  });

  it("approves write / admin / maintain permissions", async () => {
    for (const permission of ["write", "admin", "maintain"]) {
      const r = await ensureActorHasWriteAccess({
        actor: "dev",
        allowUsers: "",
        allowBots: "",
        fetchPermission: async () => permission,
      });
      expect(r.status).toBe("approved");
    }
  });

  it("rejects read / none permissions", async () => {
    const r = await ensureActorHasWriteAccess({
      actor: "outsider",
      allowUsers: "",
      allowBots: "",
      fetchPermission: async () => "read",
    });
    expect(r.status).toBe("rejected");
  });

  it("rejects a non-collaborator (404) with a clear reason", async () => {
    const r = await ensureActorHasWriteAccess({
      actor: "forkuser",
      allowUsers: "",
      allowBots: "",
      fetchPermission: async () => {
        throw Object.assign(new Error("Not Found"), { status: 404 });
      },
    });
    expect(r.status).toBe("rejected");
    if (r.status === "rejected") {
      expect(r.reason).toContain("not a repository collaborator");
    }
  });
});
