/**
 * Return the trimmed value when it is a non-empty string, else `undefined`.
 * The shared "a blank or non-string field counts as absent" rule used across
 * input parsing, model resolution, and review-payload normalization.
 */
export function trimToUndefined(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
