import * as core from "@actions/core";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { context, pullRequest } from "../lib/octokit";
import { fileReferencesText, promptContextText } from "../review/promptContext";

/**
 * Write the PR metadata + labelled context-file references for the review
 * prompt. PR metadata comes from the `@actions/github` event context; only the
 * resolved model and attached file paths are passed in by the workflow.
 */
export async function run(): Promise<void> {
  const outputPath =
    process.env.TEXRA_PROMPT_CONTEXT_OUTPUT ||
    ".texra-action/review-prompt-context.md";
  const pr = pullRequest();

  const text =
    promptContextText({
      prNumber: pr?.number != null ? String(pr.number) : "",
      repository: `${context.repo.owner}/${context.repo.repo}`,
      repositoryOwner: context.repo.owner,
      repositoryName: context.repo.repo,
      prTitleJson: JSON.stringify(pr?.title ?? ""),
      prBodyJson: JSON.stringify(pr?.body ?? ""),
      baseRef: pr?.base?.ref ?? "",
      baseSha: pr?.base?.sha ?? "",
      headRef: pr?.head?.ref ?? "",
      headSha: pr?.head?.sha ?? "",
      triggerEvent: String(context.payload.action ?? context.eventName ?? ""),
      reviewMode: process.env.TEXRA_REVIEW_MODE || "external",
      reviewModel: process.env.TEXRA_REVIEW_MODEL ?? "",
    }) +
    fileReferencesText({
      reviewContextFile: process.env.REVIEW_CONTEXT_FILE,
      commentableLinesFile: process.env.COMMENTABLE_LINES_FILE,
      reviewThreadContextFile: process.env.REVIEW_THREAD_CONTEXT_FILE,
    });

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, text);
  core.setOutput("path", outputPath);
  core.info(`Wrote TeXRA review prompt context to ${outputPath}.`);
}
