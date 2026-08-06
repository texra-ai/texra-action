import { readFileSync } from "node:fs";
import { z } from "zod";

/**
 * Read and validate the JSON emitted by `texra agents run ... --output-format
 * json --print`.
 *
 * The CLI may wrap its payload as `{ result: {...} }` or emit the result object
 * directly; both shapes are handled. Legacy field aliases from CLI versions
 * before the Aug 2026 result-field canonicalization (`lastResponse` ->
 * `response`, `touchedFiles` -> `files`) are folded here, once, at the
 * boundary; downstream code only ever sees the canonical names. A payload
 * whose fields do not match the expected types is a loud error, not an empty
 * result.
 */
const RunResultSchema = z
  .looseObject({
    category: z.string().optional(),
    outcome: z.string().optional(),
    executionId: z.string().optional(),
    response: z.string().nullish(),
    /** Legacy alias for `response` (@texra-ai/cli < 0.40.0). */
    lastResponse: z.string().nullish(),
    files: z.array(z.string()).nullish(),
    /** Legacy alias for `files` (@texra-ai/cli < 0.40.0). */
    touchedFiles: z.array(z.string()).nullish(),
    /** Native structured output when the agent produced one. */
    structured: z.unknown().optional(),
    cost: z.number().optional(),
  })
  .transform(({ response, lastResponse, files, touchedFiles, ...rest }) => ({
    ...rest,
    response: response ?? lastResponse ?? "",
    files: files ?? touchedFiles ?? [],
  }));

/** Canonical run result: legacy aliases already folded. */
export type CliRunResult = z.infer<typeof RunResultSchema>;

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

export interface CliResult {
  payload: Record<string, unknown>;
  /** Validated canonical run result. */
  result: CliRunResult;
  /** Trimmed `result.response`, or "" when the run produced none. */
  finalMessage: string;
  /** Native structured output, `undefined` when the agent produced none. */
  structured: unknown;
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
  const container = payload.result !== undefined ? payload.result : payload;
  const parsed = RunResultSchema.safeParse(container);
  if (!parsed.success) {
    throw new Error(
      `The TeXRA result file at ${resultJsonPath} does not match the expected CLI result shape: ${parsed.error.message}`,
    );
  }
  const result = parsed.data;
  return {
    payload,
    result,
    finalMessage: result.response.trim(),
    structured: result.structured,
  };
}
