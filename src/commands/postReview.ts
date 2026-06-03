import * as core from "@actions/core";
import { readFileSync } from "node:fs";
import { readInputs } from "../lib/inputs";
import { context, makeOctokit, pullRequest } from "../lib/octokit";
import { postTexraReview } from "../review/postReview";
import type { ReviewPayload } from "../review/types";

/** Post the normalized review to the pull request as a single COMMENT review. */
export async function run(): Promise<void> {
  const inputs = readInputs();
  const token = inputs.githubToken;
  const reviewJsonPath = process.env.TEXRA_REVIEW_JSON || "";
  const pr = pullRequest();

  if (!token || !reviewJsonPath || pr?.number == null) {
    core.setFailed(
      "post-review requires a github-token, a review-json file, and a pull_request context.",
    );
    process.exit(1);
  }

  const review = JSON.parse(
    readFileSync(reviewJsonPath, "utf8"),
  ) as ReviewPayload;
  const octokit = makeOctokit(token);

  await postTexraReview({
    octokit,
    owner: context.repo.owner,
    repo: context.repo.repo,
    pullNumber: pr.number,
    headSha: pr.head?.sha ?? "",
    review,
    marker: inputs.reviewMarker,
    commentableLinesJsonPath:
      process.env.TEXRA_COMMENTABLE_LINES_JSON ||
      ".texra-action/commentable-lines.json",
    threadsJsonPath:
      process.env.TEXRA_THREADS_JSON ||
      ".texra-action/previous-texra-review-threads.json",
    resolveThreads: inputs.resolveThreads,
    agent: inputs.agent || undefined,
    // The resolved model is passed from the resolve-model step output.
    model: process.env.TEXRA_REVIEW_MODEL || undefined,
    logger: core,
  });
}
