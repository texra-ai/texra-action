import * as core from "@actions/core";
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseCliArgs } from "../lib/cliArgs";
import { readInputs } from "../lib/inputs";
import { splitLines } from "../lib/lines";
import { providerEnv } from "../lib/providers";

/**
 * Run `texra agents run <agent> ... --output-format json --print`, capturing the
 * JSON payload to a file and forwarding the CLI's stderr and exit status. When
 * `texra-version` is `workspace`, runs the locally built CLI bundle instead.
 *
 * Provider API keys are injected into the CLI subprocess environment from the
 * parsed inputs; the resolved model and prompt path arrive as step outputs.
 */
export async function run(): Promise<void> {
  const inputs = readInputs();
  const runnerTemp = process.env.RUNNER_TEMP || "/tmp";
  const resultJson =
    (process.env.TEXRA_RESULT_JSON || "").trim() ||
    join(runnerTemp, "texra-result.json");
  const workingDirectory =
    process.env.TEXRA_WORKING_DIRECTORY ||
    process.env.GITHUB_WORKSPACE ||
    process.cwd();
  const promptRelative = process.env.TEXRA_PROMPT_RELATIVE || "";
  const model = (process.env.TEXRA_MODEL || inputs.model).trim();
  const contextFiles = splitLines(
    process.env.TEXRA_CONTEXT_FILES || inputs.contextFiles,
  );
  const extraArgs = parseCliArgs(inputs.cliArgs);

  const args = [
    "agents",
    "run",
    inputs.agent,
    "--instruction-file",
    promptRelative,
    "--cwd",
    workingDirectory,
    "--api-mode",
    inputs.apiMode,
    "--approval-policy",
    inputs.approvalPolicy,
    "--output-format",
    inputs.outputFormat,
    "--print",
  ];
  if (model) args.push("--model", model);
  for (const file of contextFiles) args.push("--context", file);
  args.push(...extraArgs);

  const command =
    inputs.texraVersion.trim() === "workspace"
      ? {
          cmd: "node",
          argv: [
            join(workingDirectory, "packages/cli/dist/bin/texra.js"),
            ...args,
          ],
        }
      : { cmd: "texra", argv: args };

  const result = spawnSync(command.cmd, command.argv, {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, ...providerEnv(inputs.providerKeys) },
  });

  writeFileSync(resultJson, result.stdout ?? "");
  if (result.stderr) process.stderr.write(result.stderr);
  core.setOutput("result-json", resultJson);

  if (result.error) {
    core.setFailed(`Failed to run texra: ${result.error.message}`);
    process.exit(1);
  }
  process.exit(result.status ?? 0);
}
