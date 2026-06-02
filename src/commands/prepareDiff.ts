import * as core from "@actions/core";
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { parseCommentableLines, toMarkdown } from "../review/commentableLines";

/**
 * Compute the PR diff (merge-base..head) and the commentable-line anchors the
 * agent must use for inline comments. Requires a checkout with full history
 * (`fetch-depth: 0`) so the merge base is reachable.
 */
export async function run(): Promise<void> {
  const workspace = process.env.GITHUB_WORKSPACE || process.cwd();
  const baseSha = (process.env.BASE_SHA || "").trim();
  const headSha = (process.env.HEAD_SHA || "").trim();
  const diffFile = process.env.TEXRA_DIFF_FILE || ".texra-action/pr.diff";
  const commentableJson =
    process.env.TEXRA_COMMENTABLE_LINES_JSON ||
    ".texra-action/commentable-lines.json";
  const commentableMd =
    process.env.TEXRA_COMMENTABLE_LINES_MD ||
    ".texra-action/commentable-lines.md";

  if (!baseSha || !headSha) {
    core.setFailed("prepare-diff requires BASE_SHA and HEAD_SHA.");
    process.exit(1);
  }

  const git = (gitArgs: string[]): string => {
    const result = spawnSync("git", gitArgs, {
      cwd: workspace,
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
    });
    if (result.status !== 0) {
      throw new Error(
        `git ${gitArgs.join(" ")} failed: ${result.stderr || result.stdout}`,
      );
    }
    return result.stdout ?? "";
  };

  const mergeBase = git(["merge-base", baseSha, headSha]).trim();
  const diff = git(["diff", "--find-renames", mergeBase, headSha]);

  for (const file of [diffFile, commentableJson, commentableMd]) {
    mkdirSync(dirname(file), { recursive: true });
  }
  writeFileSync(diffFile, diff);
  const payload = parseCommentableLines(diff);
  writeFileSync(commentableJson, `${JSON.stringify(payload, null, 2)}\n`);
  writeFileSync(commentableMd, `${toMarkdown(payload)}\n`);

  core.setOutput("diff-file", diffFile);
  core.setOutput("commentable-lines-json", commentableJson);
  core.setOutput("commentable-lines-md", commentableMd);
}
