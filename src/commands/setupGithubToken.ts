import * as core from "@actions/core";
import { resolveGitHubToken } from "../lib/githubAppToken";
import { readInputs } from "../lib/inputs";

/** Resolve and export the GitHub credential used by all later action steps. */
export async function run(): Promise<void> {
  const inputs = readInputs();
  const resolved = await resolveGitHubToken({
    providedToken: inputs.githubToken,
    getIdToken: (audience) => core.getIDToken(audience),
    fetchImpl: fetch,
  });

  if (resolved.untrustedWorkflowReason) {
    core.setOutput("skipped", "true");
    core.notice(
      `Skipping TeXRA: ${resolved.untrustedWorkflowReason}. ` +
        "Merge the workflow change, or set github-token to authenticate without the TeXRA GitHub App.",
    );
    return;
  }

  core.setSecret(resolved.token);
  core.setOutput("token", resolved.token);
}
