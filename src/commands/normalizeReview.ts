import * as core from "@actions/core";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { isStatusOnlyMessage, loadCliResult } from "../lib/cliResult";
import { readInputs } from "../lib/inputs";
import { runnerTemp } from "../lib/runnerEnv";
import { DEFAULT_REVIEW_BODY, normalizeReview } from "../review/normalize";

/**
 * Review-mode result parser: turn the agent's final message into the canonical
 * `{ body, comments, thread_actions }` payload and write it for `post-review`.
 */
export async function run(): Promise<void> {
  const resultJson = process.env.RESULT_JSON || "";
  const temp = runnerTemp();
  const { finalMessage, structured } = loadCliResult(resultJson);
  const hasUsableMessage = Boolean(
    finalMessage && !isStatusOnlyMessage(finalMessage),
  );
  if (!hasUsableMessage && structured === undefined) {
    // Keep posting the fallback body so the review marker still lands, but
    // make the breakage visible: a silent fallback masked a CLI result-field
    // rename for days (texra-ai/texra-action#6).
    core.warning(
      `TeXRA run ended without a usable final review message (got ${JSON.stringify(finalMessage)}); posting the fallback review body.`,
    );
  }
  const rawFinalMessage = hasUsableMessage ? finalMessage : DEFAULT_REVIEW_BODY;

  const review = normalizeReview(rawFinalMessage, structured);
  const body = review.body.trim();

  const outputFile =
    readInputs().outputFile.trim() || join(temp, "texra-code-review.md");
  const reviewJsonFile = join(temp, "texra-code-review-normalized.json");
  mkdirSync(dirname(outputFile), { recursive: true });
  writeFileSync(outputFile, `${body}\n`);
  writeFileSync(reviewJsonFile, `${JSON.stringify(review, null, 2)}\n`);

  core.setOutput("final-message", body);
  core.setOutput("output-file", outputFile);
  core.setOutput("review-json", reviewJsonFile);
}
