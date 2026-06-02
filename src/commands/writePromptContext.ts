import * as core from "@actions/core";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileReferencesText, promptContextText } from "../review/promptContext";

/** Write the PR metadata + labelled context-file references for the review prompt. */
export async function run(): Promise<void> {
  const outputPath =
    process.env.TEXRA_PROMPT_CONTEXT_OUTPUT ||
    ".texra-action/review-prompt-context.md";
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, promptContextText() + fileReferencesText());
  core.setOutput("path", outputPath);
  core.info(`Wrote TeXRA review prompt context to ${outputPath}.`);
}
