import type {
  CommentableFile,
  CommentableLines,
  LineRange,
  Side,
} from "./types";

type Anchors = Map<string, { LEFT: Set<number>; RIGHT: Set<number> }>;

function ensureAnchor(anchors: Anchors, filePath: string) {
  let entry = anchors.get(filePath);
  if (!entry) {
    entry = { LEFT: new Set<number>(), RIGHT: new Set<number>() };
    anchors.set(filePath, entry);
  }
  return entry;
}

function addAnchor(
  anchors: Anchors,
  filePath: string | null,
  side: Side,
  line: number,
) {
  if (!filePath || !Number.isInteger(line) || line < 1) return;
  ensureAnchor(anchors, filePath)[side].add(line);
}

function ranges(values: Iterable<number>): LineRange[] {
  const sorted = [...values].sort((a, b) => a - b);
  const result: LineRange[] = [];
  for (const value of sorted) {
    const last = result.at(-1);
    if (last && value === last.end + 1) {
      last.end = value;
    } else {
      result.push({ start: value, end: value });
    }
  }
  return result;
}

/**
 * Parse a unified diff into the set of lines that accept inline review comments.
 * Only changed lines are anchored: RIGHT anchors are added (`+`) head lines and
 * LEFT anchors are removed (`-`) base lines. Unchanged context lines advance the
 * counters but are deliberately not made commentable, keeping comments on the
 * actual diff. Mirrors how GitHub validates `line`/`side` for review comments.
 */
export function parseCommentableLines(diffText: string): CommentableLines {
  const anchors: Anchors = new Map();
  let currentPath: string | null = null;
  let oldLine = 0;
  let newLine = 0;
  let inHunk = false;
  const lines = diffText.endsWith("\n")
    ? diffText.slice(0, -1).split("\n")
    : diffText.split("\n");

  for (const line of lines) {
    const fileMatch = line.match(/^diff --git a\/(.+) b\/(.+)$/);
    if (fileMatch) {
      currentPath = fileMatch[2];
      inHunk = false;
      continue;
    }
    const oldFileMatch = line.match(/^--- a\/(.+)$/);
    if (oldFileMatch && currentPath == null) {
      currentPath = oldFileMatch[1];
      continue;
    }
    const newFileMatch = line.match(/^\+\+\+ b\/(.+)$/);
    if (newFileMatch && !inHunk) {
      currentPath = newFileMatch[1];
      inHunk = false;
      continue;
    }
    const hunkMatch = line.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (hunkMatch) {
      oldLine = Number.parseInt(hunkMatch[1], 10);
      newLine = Number.parseInt(hunkMatch[2], 10);
      inHunk = true;
      continue;
    }
    if (!currentPath || !inHunk) {
      continue;
    }
    if (line.startsWith("+")) {
      addAnchor(anchors, currentPath, "RIGHT", newLine);
      newLine += 1;
    } else if (line.startsWith("-")) {
      addAnchor(anchors, currentPath, "LEFT", oldLine);
      oldLine += 1;
    } else if (line.startsWith(" ") || line === "") {
      oldLine += 1;
      newLine += 1;
    }
  }

  return {
    note: "Use these line anchors for GitHub inline review comments. RIGHT means head lines; LEFT means removed base lines.",
    files: [...anchors.entries()].map(
      ([filePath, sides]): CommentableFile => ({
        path: filePath,
        right: ranges(sides.RIGHT),
        left: ranges(sides.LEFT),
      }),
    ),
  };
}

function formatRanges(items: LineRange[]): string {
  return (
    items
      .map((range) =>
        range.start === range.end
          ? `${range.start}`
          : `${range.start}-${range.end}`,
      )
      .join(", ") || "(none)"
  );
}

/** Render commentable anchors as the Markdown the agent reads alongside the diff. */
export function toMarkdown(payload: CommentableLines): string {
  return [
    "# Commentable PR Lines",
    "",
    "Use only these line anchors for JSON `comments`. Use `RIGHT` for changed head lines and `LEFT` for removed base lines. Put all other findings in the review body.",
    "",
    ...payload.files.flatMap((file) => [
      `## ${file.path}`,
      `- RIGHT: ${formatRanges(file.right)}`,
      `- LEFT: ${formatRanges(file.left)}`,
      "",
    ]),
  ].join("\n");
}
