import * as core from "@actions/core";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { loadCliResult } from "../lib/cliResult";
import { readInputs } from "../lib/inputs";
import { parseModelJson } from "../lib/parseModelJson";
import { runnerTemp } from "../lib/runnerEnv";

/**
 * Generic result parser for the core action: surface the agent's final message,
 * write it to a file, and (best-effort) expose any embedded JSON object as
 * `structured-output` for downstream steps.
 */
export async function run(): Promise<void> {
  const resultJson = process.env.RESULT_JSON || "";
  const { finalMessage } = loadCliResult(resultJson);

  const outputFile =
    readInputs().outputFile.trim() ||
    join(runnerTemp(), "texra-final-message.md");
  mkdirSync(dirname(outputFile), { recursive: true });
  writeFileSync(outputFile, `${finalMessage}\n`);

  const structured = parseModelJson(finalMessage);
  core.setOutput("final-message", finalMessage);
  core.setOutput("output-file", outputFile);
  core.setOutput("result-json", resultJson);
  core.setOutput(
    "structured-output",
    structured !== undefined ? JSON.stringify(structured) : "",
  );
}
