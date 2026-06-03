import { parseModelJson } from "../lib/parseModelJson";
import { trimToUndefined } from "../lib/text";
import { ReviewCommentSchema, ThreadActionSchema } from "./schema";
import type { ReviewComment, ReviewPayload, ThreadAction } from "./types";

export const DEFAULT_REVIEW_BODY =
  "TeXRA completed without a final review message.";

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function normalizeModelComment(
  comment: unknown,
): ReviewComment | undefined {
  const result = ReviewCommentSchema.safeParse(comment);
  return result.success ? result.data : undefined;
}

export function normalizeThreadAction(
  action: unknown,
): ThreadAction | undefined {
  const result = ThreadActionSchema.safeParse(action);
  return result.success ? result.data : undefined;
}

export function dedupeThreadActions(actions: ThreadAction[]): ThreadAction[] {
  const actionsByThread = new Map<string, ThreadAction>();
  for (const action of actions) {
    const key = `${action.action}\0${action.thread_id}`;
    const existing = actionsByThread.get(key);
    if (!existing || (!existing.body && action.body)) {
      actionsByThread.set(key, action);
    }
  }
  return [...actionsByThread.values()];
}

/**
 * Turn a (possibly chatty) model message into the canonical review payload.
 * Falls back to treating the whole message as the review body when it is not
 * valid JSON. Accepts several legacy aliases for thread actions.
 */
export function normalizeReview(rawText: string): ReviewPayload {
  const modelPayload = parseModelJson(rawText);
  if (!modelPayload || typeof modelPayload !== "object") {
    return { body: rawText, comments: [], thread_actions: [] };
  }

  const payload = modelPayload as Record<string, unknown>;
  const body =
    trimToUndefined(payload.body) ??
    trimToUndefined(payload.summary) ??
    DEFAULT_REVIEW_BODY;
  const comments = asArray(payload.comments)
    .map(normalizeModelComment)
    .filter((comment): comment is ReviewComment => comment != null);

  const rawThreadActions: unknown[] = [
    ...asArray(payload.thread_actions),
    ...asArray(payload.threadActions),
    ...asArray(payload.thread_replies).map((reply) => ({
      ...(reply as object),
      action: "reply",
    })),
    ...asArray(payload.resolved_threads).map((thread) => ({
      ...(thread as object),
      action: "resolve",
    })),
    ...asArray(payload.unresolved_threads).map((thread) => ({
      ...(thread as object),
      action: "unresolve",
    })),
  ];

  return {
    body,
    comments: comments.slice(0, 50),
    thread_actions: dedupeThreadActions(
      rawThreadActions
        .map(normalizeThreadAction)
        .filter((action): action is ThreadAction => action != null),
    ).slice(0, 50),
  };
}
