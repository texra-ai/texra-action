import * as core from "@actions/core";
import { context, errorMessage, makeOctokit } from "../lib/octokit";

function parseList(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

/**
 * Optional authorization gate (enabled via `require-write-access`). Requires the
 * triggering actor to have repo write access unless explicitly allow-listed.
 * Mirrors codex-action's `check-write-access` so the action cannot be summoned
 * to spend provider credits by an untrusted actor (e.g. via pull_request_target).
 */
export async function run(): Promise<void> {
  const token = process.env.GITHUB_TOKEN ?? "";
  const allowUsers = parseList(process.env.ALLOW_USERS);
  const allowBots = (process.env.ALLOW_BOTS ?? "").trim();
  const actor = context.actor;

  if (allowUsers.includes("*") || allowUsers.includes(actor)) {
    core.info(`Actor ${actor} is explicitly allow-listed.`);
    return;
  }

  const isBot =
    actor.endsWith("[bot]") || context.payload.sender?.type === "Bot";
  if (isBot) {
    const bots = parseList(allowBots);
    if (allowBots === "*" || bots.includes(actor)) {
      core.info(`Bot actor ${actor} is allow-listed.`);
      return;
    }
    core.setFailed(
      `Bot actor ${actor} is not in allow-bots; refusing to run TeXRA.`,
    );
    process.exit(1);
  }

  if (!token) {
    core.setFailed(
      "require-write-access is enabled but no github-token was provided to verify permissions.",
    );
    process.exit(1);
  }

  try {
    const octokit = makeOctokit(token);
    const { data } = await octokit.rest.repos.getCollaboratorPermissionLevel({
      owner: context.repo.owner,
      repo: context.repo.repo,
      username: actor,
    });
    if (data.permission === "admin" || data.permission === "write") {
      core.info(`Actor ${actor} has ${data.permission} access.`);
      return;
    }
    core.setFailed(
      `Actor ${actor} has '${data.permission}' access; write access is required. Add them to allow-users to override.`,
    );
    process.exit(1);
  } catch (error) {
    core.setFailed(
      `Could not verify write access for ${actor}: ${errorMessage(error)}`,
    );
    process.exit(1);
  }
}
