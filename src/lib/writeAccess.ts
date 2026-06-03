/**
 * Authorization gate for the action. Mirrors openai/codex-action's
 * `ensureActorHasWriteAccess`: a pure, testable resolver that returns a
 * structured verdict so the command layer decides how to surface it. The
 * collaborator lookup is injected so this module stays free of Octokit.
 */
export type WriteAccessCheck =
  | { status: "approved"; actor: string; reason: string }
  | { status: "rejected"; actor: string; reason: string };

/** GitHub permission levels that count as write access. */
const WRITE_PERMISSIONS = new Set(["admin", "write", "maintain"]);

export interface WriteAccessOptions {
  /** Triggering actor (e.g. github.context.actor / GITHUB_ACTOR). */
  actor: string | undefined;
  /** Comma-separated usernames to allow, or "*" for everyone. */
  allowUsers: string;
  /** Comma-separated bot usernames to allow, or "*" for all bots. */
  allowBots: string;
  /**
   * Resolve the actor's collaborator permission level. Should reject with a
   * 404-bearing error when the actor is not a collaborator.
   */
  fetchPermission: (username: string) => Promise<string>;
}

function parseList(value: string): string[] {
  return value
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

function isBotActor(actor: string): boolean {
  return actor.toLowerCase().endsWith("[bot]");
}

function isNotFoundError(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === "object" &&
      "status" in error &&
      (error as { status?: number }).status === 404,
  );
}

export async function ensureActorHasWriteAccess(
  options: WriteAccessOptions,
): Promise<WriteAccessCheck> {
  const actor = options.actor?.trim();
  if (!actor) {
    return {
      status: "rejected",
      actor: "<unknown>",
      reason: "the triggering actor could not be determined.",
    };
  }

  const allowUsers = options.allowUsers.trim();
  if (allowUsers === "*") {
    return {
      status: "approved",
      actor,
      reason: "allow-users='*' permits all users.",
    };
  }
  if (parseList(allowUsers).includes(actor.toLowerCase())) {
    return {
      status: "approved",
      actor,
      reason: "is explicitly allow-listed via allow-users.",
    };
  }

  if (isBotActor(actor)) {
    const allowBots = options.allowBots.trim();
    if (allowBots === "*") {
      return {
        status: "approved",
        actor,
        reason: "allow-bots='*' permits all bots.",
      };
    }
    if (parseList(allowBots).includes(actor.toLowerCase())) {
      return {
        status: "approved",
        actor,
        reason: "is explicitly allow-listed via allow-bots.",
      };
    }
    return {
      status: "rejected",
      actor,
      reason: `bot actors are not allowed; add '${actor}' to allow-bots to override.`,
    };
  }

  let permission: string;
  try {
    permission = await options.fetchPermission(actor);
  } catch (error) {
    if (isNotFoundError(error)) {
      return {
        status: "rejected",
        actor,
        reason: "is not a repository collaborator; write access is required.",
      };
    }
    return {
      status: "rejected",
      actor,
      reason: `could not verify permissions: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }

  if (WRITE_PERMISSIONS.has(permission)) {
    return { status: "approved", actor, reason: `has '${permission}' access.` };
  }
  return {
    status: "rejected",
    actor,
    reason: `has '${permission}' access; write access is required (add to allow-users to override).`,
  };
}
