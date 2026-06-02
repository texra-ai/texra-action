#!/usr/bin/env bun
/**
 * texra-action multitool. action.yml steps invoke a single subcommand each:
 *
 *   bun run src/main.ts <subcommand>
 *
 * Inputs arrive via environment variables set by the step; outputs are written
 * with @actions/core. Keeping all glue in one bundle means the action installs
 * its dependencies once (`bun install --production`) and reuses them per step.
 */
import * as core from "@actions/core";

const commands: Record<string, () => Promise<void>> = {
  "check-write-access": () =>
    import("./commands/checkWriteAccess").then((m) => m.run()),
  "resolve-prompt": () =>
    import("./commands/resolvePrompt").then((m) => m.run()),
  "run-agent": () => import("./commands/runAgent").then((m) => m.run()),
  "parse-result": () => import("./commands/parseResult").then((m) => m.run()),
  "resolve-model": () => import("./commands/resolveModel").then((m) => m.run()),
  "prepare-diff": () => import("./commands/prepareDiff").then((m) => m.run()),
  "write-prompt-context": () =>
    import("./commands/writePromptContext").then((m) => m.run()),
  "collect-threads": () =>
    import("./commands/collectThreads").then((m) => m.run()),
  "normalize-review": () =>
    import("./commands/normalizeReview").then((m) => m.run()),
  "post-review": () => import("./commands/postReview").then((m) => m.run()),
};

const name = process.argv[2];
const command = name ? commands[name] : undefined;

if (!command) {
  core.setFailed(
    `Unknown texra-action command: ${name ?? "(none)"}. Known commands: ${Object.keys(
      commands,
    ).join(", ")}`,
  );
  process.exit(1);
}

command().catch((error) => {
  core.setFailed(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
