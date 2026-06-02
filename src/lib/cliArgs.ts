/**
 * Parse a passthrough `cli-args` input into an argv array. A value starting with
 * `[` is parsed as a JSON array; otherwise it is split shell-style with basic
 * single/double-quote support (codex-action's `codex-args` convention).
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
  return shellSplit(value);
}

function shellSplit(value: string): string[] {
  const tokens: string[] = [];
  const pattern = /"([^"]*)"|'([^']*)'|(\S+)/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(value)) !== null) {
    tokens.push(match[1] ?? match[2] ?? match[3] ?? "");
  }
  return tokens;
}
