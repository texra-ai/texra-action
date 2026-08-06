import * as core from "@actions/core";
import { resolveGitHubToken } from "../lib/githubAppToken";
import { readInputs } from "../lib/inputs";

/** Resolve and export the GitHub credential used by all later action steps. */
export async function run(): Promise<void> {
  const inputs = readInputs();
  const token = await resolveGitHubToken({
    providedToken: inputs.githubToken,
    getIdToken: (audience) => core.getIDToken(audience),
    fetchImpl: fetch,
  });

  core.setSecret(token);
  core.setOutput("token", token);
}
