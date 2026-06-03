import { readFileSync } from "node:fs";

/**
 * Read and interpret the JSON emitted by `texra agents run ... --output-format
 * json --print`.
 *
 * The CLI may wrap its payload as `{ result: {...} }` or emit the result object
 * directly; both shapes are handled. The agent's last assistant message lives on
 * `result.lastResponse`.
 */
export interface CliResult {
  payload: Record<string, unknown>;
  result: Record<string, unknown>;
  /** Trimmed `result.lastResponse`, or "" when absent. */
  finalMessage: string;
}

/** Short acknowledgements a tool-use agent may emit instead of real content. */
export const STATUS_ONLY_MESSAGES = new Set([
  "complete",
  "completed",
  "done",
  "ok",
  "success",
  "succeeded",
]);

export function isStatusOnlyMessage(value: string): boolean {
  return STATUS_ONLY_MESSAGES.has(value.trim().toLowerCase());
}

export function loadCliResult(resultJsonPath: string): CliResult {
  if (!resultJsonPath) {
    throw new Error(
      "No TeXRA result file was provided (RESULT_JSON is empty); the run step did not produce output.",
    );
  }
  let raw: string;
  try {
    raw = readFileSync(resultJsonPath, "utf8");
  } catch {
    throw new Error(
      `Could not read the TeXRA result file at ${resultJsonPath}; the run step may have failed before writing it.`,
    );
  }
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    throw new Error(
      `The TeXRA result file at ${resultJsonPath} is not valid JSON; ensure the agent ran with --output-format json --print.`,
    );
  }
  const result = ((payload.result as Record<string, unknown>) ??
    payload) as Record<string, unknown>;
  const finalMessage = String((result.lastResponse as string) || "").trim();
  return { payload, result, finalMessage };
}
