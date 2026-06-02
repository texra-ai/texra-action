export type Side = "LEFT" | "RIGHT";

/** A normalized inline review comment, ready for the GitHub reviews API. */
export interface ReviewComment {
  path: string;
  body: string;
  line?: number;
  side?: Side;
  start_line?: number;
  start_side?: Side;
  position?: number;
}

export type ThreadActionKind = "reply" | "resolve" | "unresolve";

/** An action to apply to a previous TeXRA review thread. */
export interface ThreadAction {
  action: ThreadActionKind;
  thread_id: string;
  body?: string;
}

/** The canonical review payload TeXRA produces and the action posts. */
export interface ReviewPayload {
  body: string;
  comments: ReviewComment[];
  thread_actions: ThreadAction[];
}

export interface LineRange {
  start: number;
  end: number;
}

export interface CommentableFile {
  path: string;
  right: LineRange[];
  left: LineRange[];
}

/** Valid GitHub inline-review anchors derived from the PR diff. */
export interface CommentableLines {
  note: string;
  files: CommentableFile[];
}
