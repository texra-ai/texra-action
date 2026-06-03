import * as core from "@actions/core";
import { readInputs } from "../lib/inputs";
import { context, makeOctokit } from "../lib/octokit";
import { ensureActorHasWriteAccess } from "../lib/writeAccess";

/**
 * Optional authorization gate (enabled via `require-write-access`). Requires the
 * triggering actor to have repo write access unless explicitly allow-listed, so
 * the action cannot be summoned to spend provider credits by an untrusted actor
 * (e.g. via pull_request_target). Robust resolution lives in `../lib/writeAccess`.
 */
export async function run(): Promise<void> {
  const inputs = readInputs();
  const token = inputs.githubToken;
  const octokit = token ? makeOctokit(token) : null;

  const result = await ensureActorHasWriteAccess({
    actor: context.actor,
    allowUsers: inputs.allowUsers,
    allowBots: inputs.allowBots,
    fetchPermission: async (username) => {
      if (!octokit) {
        throw new Error(
          "a github-token is required to verify write access (none was provided).",
        );
      }
      const { data } = await octokit.rest.repos.getCollaboratorPermissionLevel({
        owner: context.repo.owner,
        repo: context.repo.repo,
        username,
      });
      return data.permission ?? "none";
    },
  });

  if (result.status === "approved") {
    core.info(`Actor ${result.actor} ${result.reason}`);
    return;
  }
  core.setFailed(`Actor ${result.actor} ${result.reason}`);
  process.exit(1);
}
