/**
 * Extract a JSON object from a chatty model message.
 *
 * Tool-use agents are asked to emit a single JSON object, but models often wrap
 * it in prose or a fenced code block. This walks a ladder of increasingly
 * permissive strategies: parse the whole string, then any ```json fence, then
 * the outermost `{ ... }` span. Returns `undefined` if nothing parses.
 *
 * This logic is generic (every JSON-producing agent needs it) and is shared by
 * the core `parse-result` command and the review `normalize-review` command.
 */
export function fencedJsonBlocks(text: string): string[] {
  return Array.from(
    text.matchAll(/^```(?:json)?[ \t]*\r?\n([\s\S]*?)\r?\n```[ \t]*$/gim),
    (match) => match[1] ?? "",
  );
}

export function parseModelJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    // fall through to the next strategy
  }

  for (const fenced of fencedJsonBlocks(text)) {
    try {
      return JSON.parse(fenced);
    } catch {
      // try the next fenced block
    }
  }

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(text.slice(start, end + 1));
    } catch {
      // give up below
    }
  }

  return undefined;
}
