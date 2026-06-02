import * as core from "@actions/core";
import { readFileSync } from "node:fs";
import { context, makeOctokit } from "../lib/octokit";
import { postTexraReview } from "../review/postReview";
import type { ReviewPayload } from "../review/types";

/** Post the normalized review to the pull request as a single COMMENT review. */
export async function run(): Promise<void> {
  const token = process.env.GITHUB_TOKEN || "";
  const reviewJsonPath = process.env.TEXRA_REVIEW_JSON || "";
  const prNumber = context.payload.pull_request?.number;

  if (!token || !reviewJsonPath || prNumber == null) {
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
    pullNumber: prNumber,
    headSha:
      process.env.HEAD_SHA || context.payload.pull_request?.head?.sha || "",
    review,
    marker: process.env.TEXRA_REVIEW_MARKER || "<!-- texra-review -->",
    commentableLinesJsonPath:
      process.env.TEXRA_COMMENTABLE_LINES_JSON ||
      ".texra-action/commentable-lines.json",
    threadsJsonPath:
      process.env.TEXRA_THREADS_JSON ||
      ".texra-action/previous-texra-review-threads.json",
    resolveThreads: process.env.TEXRA_RESOLVE_THREADS === "true",
    agent: process.env.TEXRA_REVIEW_AGENT || undefined,
    model: process.env.TEXRA_REVIEW_MODEL || undefined,
    logger: core,
  });
}
