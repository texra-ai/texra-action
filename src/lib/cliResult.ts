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
  const raw = readFileSync(resultJsonPath, "utf8");
  const payload = JSON.parse(raw) as Record<string, unknown>;
  const result = ((payload.result as Record<string, unknown>) ??
    payload) as Record<string, unknown>;
  const finalMessage = String((result.lastResponse as string) || "").trim();
  return { payload, result, finalMessage };
}
