import parseArgsStringToArgv from "string-argv";

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
