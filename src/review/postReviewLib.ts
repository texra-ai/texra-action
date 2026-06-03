import { existsSync, readFileSync } from "node:fs";
import type { ReviewComment, Side } from "./types";

export const DEFAULT_MARKER = "<!-- texra-review -->";

export type CommentableMap = Map<
  string,
  { LEFT: Set<number>; RIGHT: Set<number> }
>;

function expandRanges(ranges: unknown): Set<number> {
  const result = new Set<number>();
  for (const range of Array.isArray(ranges) ? ranges : []) {
    const start = Number(range?.start);
    const end = Number(range?.end);
    if (!Number.isInteger(start) || !Number.isInteger(end)) continue;
    for (let line = start; line <= end; line += 1) result.add(line);
  }
  return result;
}

/**
 * Load the commentable-line anchors written by `prepare-diff`. Returns null when
 * the file is absent or unreadable/malformed — inline validation is best-effort,
 * so a corrupt anchors file should not fail the review.
 */
export function loadCommentableLines(
  anchorPath: string,
): CommentableMap | null {
  if (!existsSync(anchorPath)) return null;
  let payload: {
    files?: Array<{ path?: string; left?: unknown; right?: unknown }>;
  };
  try {
    payload = JSON.parse(readFileSync(anchorPath, "utf8"));
  } catch {
    return null;
  }
  const files: CommentableMap = new Map();
  for (const file of Array.isArray(payload.files) ? payload.files : []) {
    if (!file.path) continue;
    files.set(file.path, {
      LEFT: expandRanges(file.left),
      RIGHT: expandRanges(file.right),
    });
  }
  return files;
}

/** Prefix a comment/review body with the TeXRA marker so threads are findable. */
export function markedBody(
  body: string | undefined,
  marker: string = DEFAULT_MARKER,
): string {
  const text = String(body || "").trim();
  return `${marker || DEFAULT_MARKER}\n${
    text || "## TeXRA Code Review\n\nNo review body was produced."
  }`;
}

export interface FormattedComment {
  path: string;
  body: string;
  position?: number;
  line?: number;
  side?: Side;
  start_line?: number;
  start_side?: Side;
}

export function formatReviewComment(
  comment: ReviewComment,
  marker: string,
): FormattedComment {
  const result: FormattedComment = {
    path: comment.path,
    body: markedBody(comment.body, marker),
  };
  if (comment.position != null) {
    result.position = comment.position;
  } else {
    result.line = comment.line;
    result.side = comment.side || "RIGHT";
    if (comment.start_line != null) result.start_line = comment.start_line;
    if (comment.start_side) result.start_side = comment.start_side;
  }
  return result;
}

export function hasCommentableLine(
  commentableLines: CommentableMap | null,
  filePath: string,
  side: Side,
  line: number,
): boolean {
  if (!commentableLines) return true;
  const sides = commentableLines.get(filePath);
  return sides?.[side || "RIGHT"]?.has(line) ?? false;
}

/** Whether a comment lands on a line GitHub will accept for inline review. */
export function isCommentable(
  comment: FormattedComment,
  commentableLines: CommentableMap | null,
): boolean {
  if (comment.position != null) return true;
  if (!Number.isInteger(comment.line)) return false;
  const side: Side = comment.side || "RIGHT";
  if (
    !hasCommentableLine(commentableLines, comment.path, side, comment.line!)
  ) {
    return false;
  }
  if (comment.start_line != null) {
    return hasCommentableLine(
      commentableLines,
      comment.path,
      comment.start_side || side,
      comment.start_line,
    );
  }
  return true;
}

export function fallbackItems(
  comments: FormattedComment[],
  marker: string,
): string {
  return comments
    .map(
      (comment) =>
        `- \`${comment.path}\`${comment.line ? `:${comment.line}` : ""}: ${comment.body
          .replaceAll(marker, "")
          .trim()}`,
    )
    .join("\n");
}

export function reviewAttributionFooter(opts: {
  agent?: string;
  model?: string;
}): string {
  const parts: string[] = [];
  if (opts.agent) parts.push(`agent \`${opts.agent}\``);
  if (opts.model) parts.push(`model \`${opts.model}\``);
  if (parts.length === 0) return "";
  return `\n\n---\n\nReviewed by TeXRA ${parts.join(" with ")}.`;
}

export interface ThreadState {
  isResolved: boolean;
}

export function loadKnownThreadStates(
  threadContextPath: string,
): Map<string, ThreadState> | null {
  if (!existsSync(threadContextPath)) return null;
  let payload: { threads?: Array<{ id?: unknown; isResolved?: unknown }> };
  try {
    payload = JSON.parse(readFileSync(threadContextPath, "utf8"));
  } catch {
    // Thread actions are optional; a corrupt context file should not block posting.
    return null;
  }
  const threads = new Map<string, ThreadState>();
  for (const thread of Array.isArray(payload.threads) ? payload.threads : []) {
    if (typeof thread.id === "string" && thread.id.trim()) {
      threads.set(thread.id.trim(), { isResolved: thread.isResolved === true });
    }
  }
  return threads;
}
