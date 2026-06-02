import * as core from "@actions/core";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import { join, relative, sep } from "node:path";

function splitLines(value: string | undefined): string[] {
  return (value ?? "")
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

/**
 * Assemble the instruction file the agent runs against: the prompt (inline or
 * file) followed by any runtime context and a list of attached context files.
 * Emits the working directory plus absolute and workspace-relative prompt paths.
 */
export async function run(): Promise<void> {
  const workspace = process.env.GITHUB_WORKSPACE ?? process.cwd();
  const workingDirectoryInput = (
    process.env.INPUT_WORKING_DIRECTORY ?? ""
  ).trim();
  const workingDirectory = realpathSync(workingDirectoryInput || workspace);

  let prompt = process.env.INPUT_PROMPT ?? "";
  const promptFile = (process.env.INPUT_PROMPT_FILE ?? "").trim();
  if (!prompt && promptFile) {
    if (!existsSync(promptFile)) {
      core.setFailed(`TeXRA prompt file not found: ${promptFile}`);
      process.exit(1);
    }
    prompt = readFileSync(promptFile, "utf8");
  }
  if (!prompt.trim()) {
    core.setFailed("Either prompt or prompt-file must be provided.");
    process.exit(1);
  }

  const actionDir = join(workingDirectory, ".texra-action");
  mkdirSync(actionDir, { recursive: true });
  const promptPath = join(actionDir, "agent-instruction.md");

  const sections: string[] = [`${prompt.replace(/\n*$/, "")}\n`];

  const promptContext = (process.env.INPUT_PROMPT_CONTEXT ?? "").trim();
  if (promptContext) sections.push(`\n## Runtime Context\n${promptContext}\n`);

  const promptContextFile = (
    process.env.INPUT_PROMPT_CONTEXT_FILE ?? ""
  ).trim();
  if (promptContextFile) {
    if (!existsSync(promptContextFile)) {
      core.setFailed(
        `TeXRA prompt context file not found: ${promptContextFile}`,
      );
      process.exit(1);
    }
    sections.push(
      `\n## Runtime Context\n${readFileSync(promptContextFile, "utf8")}\n`,
    );
  }

  for (const file of splitLines(process.env.INPUT_CONTEXT_FILES)) {
    sections.push(`\nContext file: \`${file}\`\n`);
  }

  writeFileSync(promptPath, sections.join(""));

  const promptRelative = relative(workingDirectory, promptPath)
    .split(sep)
    .join("/");
  core.setOutput("working-directory", workingDirectory);
  core.setOutput("prompt-path", promptPath);
  core.setOutput("prompt-relative", promptRelative);
}
