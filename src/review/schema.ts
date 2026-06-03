import { z } from "zod";
import type { ReviewComment, ThreadAction } from "./types";

/**
 * Zod schemas for the agent's review payload. `z.preprocess` mirrors the
 * original hand-rolled guards' "coerce an invalid field to undefined" behaviour
 * so a single bad field drops that field (or, when required, the whole item)
 * rather than throwing.
 */

/** Trimmed non-empty string, else undefined. */
const optText = z.preprocess(
  (v) => (typeof v === "string" && v.trim() ? v.trim() : undefined),
  z.string().optional(),
);

/** Required trimmed non-empty string (failure drops the item). */
const reqText = z.preprocess(
  (v) => (typeof v === "string" && v.trim() ? v.trim() : undefined),
  z.string(),
);

/** Integer, else undefined. */
const optInt = z.preprocess(
  (v) => (typeof v === "number" && Number.isInteger(v) ? v : undefined),
  z.number().int().optional(),
);

/** "LEFT" | "RIGHT", else undefined. */
const optSide = z.preprocess(
  (v) => (v === "LEFT" || v === "RIGHT" ? v : undefined),
  z.enum(["LEFT", "RIGHT"]).optional(),
);

/** A review-thread action kind (trimmed); an unknown kind drops the item. */
const actionKind = z.preprocess(
  (v) => (typeof v === "string" ? v.trim() : v),
  z.enum(["reply", "resolve", "unresolve"]),
);

export const ReviewCommentSchema = z
  .object({
    path: reqText,
    body: reqText,
    line: optInt,
    position: optInt,
    side: optSide,
    start_line: optInt,
    startLine: optInt,
    start_side: optSide,
    startSide: optSide,
  })
  .transform((comment, ctx): ReviewComment => {
    if (comment.line == null && comment.position == null) {
      ctx.addIssue({
        code: "custom",
        message: "a comment requires a line or a position",
      });
      return z.NEVER;
    }
    if (comment.line != null) {
      const normalized: ReviewComment = {
        path: comment.path,
        body: comment.body,
        line: comment.line,
        side: comment.side ?? "RIGHT",
      };
      const startLine = comment.start_line ?? comment.startLine;
      if (startLine != null) normalized.start_line = startLine;
      const startSide = comment.start_side ?? comment.startSide;
      if (startSide) normalized.start_side = startSide;
      return normalized;
    }
    return {
      path: comment.path,
      body: comment.body,
      position: comment.position as number,
    };
  });

export const ThreadActionSchema = z
  .object({
    action: actionKind,
    thread_id: optText,
    threadId: optText,
    body: optText,
  })
  .transform((action, ctx): ThreadAction => {
    const threadId = action.thread_id ?? action.threadId;
    if (!threadId) {
      ctx.addIssue({
        code: "custom",
        message: "a thread action requires a thread_id",
      });
      return z.NEVER;
    }
    if (action.action === "reply" && !action.body) {
      ctx.addIssue({ code: "custom", message: "a reply requires a body" });
      return z.NEVER;
    }
    return {
      action: action.action,
      thread_id: threadId,
      ...(action.body ? { body: action.body } : {}),
    };
  });
