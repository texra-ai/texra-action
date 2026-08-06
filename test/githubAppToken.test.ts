import { describe, expect, it } from "bun:test";
import { resolveGitHubToken } from "../src/lib/githubAppToken";

describe("resolveGitHubToken", () => {
  it("uses an explicit token without requesting OIDC", async () => {
    let requestedOidc = false;
    const token = await resolveGitHubToken({
      providedToken: "override",
      getIdToken: () => {
        requestedOidc = true;
        return Promise.resolve("unused");
      },
      fetchImpl: fetch,
    });

    expect(token).toBe("override");
    expect(requestedOidc).toBe(false);
  });

  it("exchanges the expected OIDC audience", async () => {
    let audience = "";
    let authorization = "";
    const token = await resolveGitHubToken({
      providedToken: "",
      getIdToken: (value) => {
        audience = value;
        return Promise.resolve("oidc-token");
      },
      fetchImpl: (_url, init) => {
        authorization = new Headers(init?.headers).get("Authorization") ?? "";
        return Promise.resolve(Response.json({ token: "installation-token" }));
      },
    });

    expect(audience).toBe("texra-github-action");
    expect(authorization).toBe("Bearer oidc-token");
    expect(token).toBe("installation-token");
  });

  it("explains the id-token permission when OIDC is unavailable", async () => {
    await expect(
      resolveGitHubToken({
        providedToken: "",
        getIdToken: () => Promise.reject(new Error("denied")),
        fetchImpl: fetch,
      }),
    ).rejects.toThrow("id-token: write");
  });

  it("surfaces exchange errors without returning a fallback token", async () => {
    await expect(
      resolveGitHubToken({
        providedToken: "",
        getIdToken: () => Promise.resolve("oidc-token"),
        fetchImpl: () =>
          Promise.resolve(
            Response.json(
              { error: "TeXRA GitHub App is not installed" },
              { status: 403 },
            ),
          ),
      }),
    ).rejects.toThrow(
      "TeXRA GitHub App token exchange failed (403): TeXRA GitHub App is not installed",
    );
  });
});
