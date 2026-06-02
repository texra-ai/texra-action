import { parseModelJson } from "../lib/parseModelJson";
import type {
  ReviewComment,
  ReviewPayload,
  Side,
  ThreadAction,
  ThreadActionKind,
} from "./types";

export const DEFAULT_REVIEW_BODY =
  "TeXRA completed without a final review message.";

function integerOrUndefined(value: unknown): number | undefined {
  return typeof value === "number" && Number.isInteger(value)
    ? value
    : undefined;
}

function sideOrUndefined(value: unknown): Side | undefined {
  return value === "LEFT" || value === "RIGHT" ? value : undefined;
}

function stringOrUndefined(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function normalizeModelComment(
  comment: unknown,
): ReviewComment | undefined {
  if (!comment || typeof comment !== "object") return undefined;
  const raw = comment as Record<string, unknown>;
  const pathValue = stringOrUndefined(raw.path);
  const body = stringOrUndefined(raw.body);
  const line = integerOrUndefined(raw.line);
  const position = integerOrUndefined(raw.position);
  if (!pathValue || !body || (line == null && position == null)) {
    return undefined;
  }

  const normalized: ReviewComment = { path: pathValue, body };
  if (line != null) {
    normalized.line = line;
    normalized.side = sideOrUndefined(raw.side) ?? "RIGHT";
    const startLine = integerOrUndefined(raw.start_line ?? raw.startLine);
    if (startLine != null) normalized.start_line = startLine;
    const startSide = sideOrUndefined(raw.start_side ?? raw.startSide);
    if (startSide) normalized.start_side = startSide;
  } else {
    normalized.position = position;
  }
  return normalized;
}

export function normalizeThreadAction(
  action: unknown,
): ThreadAction | undefined {
  if (!action || typeof action !== "object") return undefined;
  const raw = action as Record<string, unknown>;
  const kind = stringOrUndefined(raw.action) as ThreadActionKind | undefined;
  const threadId = stringOrUndefined(raw.thread_id ?? raw.threadId);
  if (
    !threadId ||
    (kind !== "reply" && kind !== "resolve" && kind !== "unresolve")
  ) {
    return undefined;
  }
  const body = stringOrUndefined(raw.body);
  if (kind === "reply" && !body) return undefined;
  return { action: kind, thread_id: threadId, ...(body ? { body } : {}) };
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
    stringOrUndefined(payload.body) ??
    stringOrUndefined(payload.summary) ??
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
