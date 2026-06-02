import * as github from "@actions/github";

/** The authenticated Octokit instance type, with `.rest` and `.graphql`. */
export type Octokit = ReturnType<typeof github.getOctokit>;

/** The GitHub Actions event context (repo, payload, …). */
export const context = github.context;

export function makeOctokit(token: string): Octokit {
  return github.getOctokit(token);
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
