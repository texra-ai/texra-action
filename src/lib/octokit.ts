import * as github from "@actions/github";

/** The authenticated Octokit instance type, with `.rest` and `.graphql`. */
export type Octokit = ReturnType<typeof github.getOctokit>;

/** The GitHub Actions event context (repo, payload, …). */
export const context = github.context;

export function makeOctokit(token: string): Octokit {
  return github.getOctokit(token);
}

/** The pull request from the triggering event payload, typed for our needs. */
export interface PullRequestContext {
  number?: number;
  title?: string;
  body?: string | null;
  base?: { ref?: string; sha?: string };
  head?: { ref?: string; sha?: string };
}

export function pullRequest(): PullRequestContext | undefined {
  return context.payload.pull_request as PullRequestContext | undefined;
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
