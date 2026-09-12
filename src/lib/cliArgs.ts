import parseArgsStringToArgv from "string-argv";

interface AgentArgInputs {
  agent: string;
  approvalPolicy: string;
  outputFormat: string;
}

export function buildAgentArgs(
  inputs: AgentArgInputs,
  promptRelative: string,
  workingDirectory: string,
  model: string,
  contextFiles: string[],
  extraArgs: string[],
): string[] {
  const args = [
    "run",
    inputs.agent,
    "--instruction-file",
    promptRelative,
    "--cwd",
    workingDirectory,
    "--approval-policy",
    inputs.approvalPolicy,
    "--output-format",
    inputs.outputFormat,
    "--print",
  ];
  if (model) args.push("--model", model);
  for (const file of contextFiles) args.push("--context", file);
  args.push(...extraArgs);
  return args;
}

/**
 * Parse a passthrough `cli-args` input into an argv array. A value starting with
 * `[` is parsed as a JSON array; otherwise it is split shell-style (handling
 * single/double quotes and escapes via `string-argv`, the same splitter
 * codex-action uses for its `codex-args` convention).
 */
export function parseCliArgs(raw: string | undefined): string[] {
  const value = (raw ?? "").trim();
  if (!value) return [];
  if (value.startsWith("[")) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map((entry) => String(entry));
    } catch {
      // fall through to shell-style splitting
    }
  }
  return parseArgsStringToArgv(value);
}
