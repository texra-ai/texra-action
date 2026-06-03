import * as core from "@actions/core";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { context, makeOctokit, pullRequest } from "../lib/octokit";
import { collectTexraThreads } from "../review/collectThreads";

/** Gather previous TeXRA review threads on the PR for the agent to reason over. */
export async function run(): Promise<void> {
  const token = process.env.GITHUB_TOKEN || "";
  const marker = process.env.TEXRA_REVIEW_MARKER || "<!-- texra-review -->";
  const outputPath =
    process.env.TEXRA_THREADS_OUTPUT ||
    ".texra-action/previous-texra-review-threads.json";
  const prNumber = pullRequest()?.number;

  if (!token || prNumber == null) {
    core.warning(
      "collect-threads requires a github-token and a pull_request context; writing an empty payload.",
    );
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(
      outputPath,
      `${JSON.stringify(
        {
          marker,
          threads: [],
          note: "No pull request context was available.",
        },
        null,
        2,
      )}\n`,
    );
    core.setOutput("path", outputPath);
    return;
  }

  const octokit = makeOctokit(token);
  await collectTexraThreads({
    octokit,
    owner: context.repo.owner,
    repo: context.repo.repo,
    prNumber,
    marker,
    outputPath,
    logger: core,
  });
  core.setOutput("path", outputPath);
}
