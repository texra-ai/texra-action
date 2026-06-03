import * as core from "@actions/core";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import { join, relative, sep } from "node:path";
import { readInputs } from "../lib/inputs";
import { splitLines } from "../lib/lines";

/**
 * Assemble the instruction file the agent runs against: the prompt (inline or
 * file) followed by any runtime context and a list of attached context files.
 * Emits the working directory plus absolute and workspace-relative prompt paths.
 *
 * Two env overrides let review mode inject step-derived values: a default prompt
 * file (`TEXRA_DEFAULT_PROMPT_FILE`) used when no `prompt-file` input is given,
 * and a generated runtime-context file (`TEXRA_PROMPT_CONTEXT_FILE`).
 */
export async function run(): Promise<void> {
  const inputs = readInputs();
  const workspace = process.env.GITHUB_WORKSPACE ?? process.cwd();
  const requestedDirectory = inputs.workingDirectory.trim() || workspace;
  let workingDirectory: string;
  try {
    workingDirectory = realpathSync(requestedDirectory);
  } catch {
    core.setFailed(
      `working-directory does not exist or is not accessible: ${requestedDirectory}`,
    );
    process.exit(1);
  }

  let prompt = inputs.prompt;
  const promptFile =
    inputs.promptFile.trim() ||
    (process.env.TEXRA_DEFAULT_PROMPT_FILE ?? "").trim();
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

  const promptContext = inputs.promptContext.trim();
  if (promptContext) sections.push(`\n## Runtime Context\n${promptContext}\n`);

  const promptContextFile =
    (process.env.TEXRA_PROMPT_CONTEXT_FILE ?? "").trim() ||
    inputs.promptContextFile.trim();
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

  for (const file of splitLines(inputs.contextFiles)) {
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
