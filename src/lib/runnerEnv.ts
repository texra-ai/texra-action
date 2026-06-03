/**
 * Small accessors for the GitHub Actions runner environment, so the per-step
 * commands share one definition of each well-known variable and its fallback.
 */

/** The runner's scratch directory (`RUNNER_TEMP`), falling back to `/tmp`. */
export function runnerTemp(): string {
  return process.env.RUNNER_TEMP || "/tmp";
}

/** The checked-out workspace (`GITHUB_WORKSPACE`), falling back to the cwd. */
export function workspaceDir(): string {
  return process.env.GITHUB_WORKSPACE || process.cwd();
}
