/**
 * Split a newline-separated input (e.g. an `actions/core` multiline input) into
 * trimmed, non-empty entries. Tolerates CRLF and a missing/blank value.
 */
export function splitLines(value: string | undefined): string[] {
  return (value ?? "")
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}
