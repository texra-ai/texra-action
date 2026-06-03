import { errorMessage, type Octokit } from "../lib/octokit";
import {
  fallbackItems,
  formatReviewComment,
  isCommentable,
  loadCommentableLines,
  loadKnownThreadStates,
  markedBody,
  reviewAttributionFooter,
  type FormattedComment,
} from "./postReviewLib";
import type { ReviewPayload, ThreadAction } from "./types";

export interface Logger {
  warning(message: string): void;
  notice(message: string): void;
}

export interface PostReviewOptions {
  octokit: Octokit;
  owner: string;
  repo: string;
  pullNumber: number;
  headSha: string;
  review: ReviewPayload;
  marker: string;
  commentableLinesJsonPath: string;
  threadsJsonPath: string;
  /** Whether a dedicated token allows thread reply / resolve mutations. */
  resolveThreads: boolean;
  agent?: string;
  model?: string;
  logger: Logger;
}

/**
 * Post the normalized TeXRA review: a single COMMENT review carrying the body
 * plus any inline comments that land on commentable lines, then apply the
 * agent's thread actions (reply / resolve / unresolve) when a token allows it.
 */
export async function postTexraReview(
  options: PostReviewOptions,
): Promise<void> {
  const {
    octokit,
    owner,
    repo,
    pullNumber,
    headSha,
    review,
    marker,
    commentableLinesJsonPath,
    threadsJsonPath,
    resolveThreads,
    agent,
    model,
    logger,
  } = options;

  const commentableLines = loadCommentableLines(commentableLinesJsonPath);
  const knownThreadStates = loadKnownThreadStates(threadsJsonPath);
  const currentThreadStates = knownThreadStates
    ? new Map(
        [...knownThreadStates.entries()].map(([threadId, state]) => [
          threadId,
          { ...state },
        ]),
      )
    : null;

  const comments: FormattedComment[] = Array.isArray(review.comments)
    ? review.comments.map((comment) => formatReviewComment(comment, marker))
    : [];
  const inlineComments: FormattedComment[] = [];
  const unplacedComments: FormattedComment[] = [];
  for (const comment of comments) {
    if (isCommentable(comment, commentableLines)) {
      inlineComments.push(comment);
    } else {
      unplacedComments.push(comment);
    }
  }

  let body = markedBody(review.body, marker);
  if (unplacedComments.length > 0) {
    body = `${body}\n\n### Inline comments not placed\n\n${fallbackItems(
      unplacedComments,
      marker,
    )}`;
  }

  const footer = reviewAttributionFooter({ agent, model });

  async function createReview(
    reviewComments: FormattedComment[],
    reviewBody: string,
  ) {
    await octokit.rest.pulls.createReview({
      owner,
      repo,
      pull_number: pullNumber,
      commit_id: headSha,
      event: "COMMENT",
      body: reviewBody,
      comments: reviewComments,
    });
  }

  try {
    await createReview(inlineComments, `${body}${footer}`);
  } catch (error) {
    if (inlineComments.length === 0) throw error;
    logger.warning(
      `Could not create inline TeXRA review comments; falling back to review body only: ${errorMessage(
        error,
      )}`,
    );
    body = `${body}\n\n### Inline comments that could not be placed\n\n${fallbackItems(
      inlineComments,
      marker,
    )}`;
    await createReview([], `${body}${footer}`);
  }

  async function replyToThread(
    threadId: string,
    replyBody: string | undefined,
  ) {
    await octokit.graphql(
      `mutation($threadId: ID!, $body: String!) {
        addPullRequestReviewThreadReply(input: {
          pullRequestReviewThreadId: $threadId,
          body: $body
        }) {
          comment { id }
        }
      }`,
      { threadId, body: markedBody(replyBody, marker) },
    );
  }

  async function setThreadResolved(threadId: string, resolved: boolean) {
    const mutation = resolved ? "resolveReviewThread" : "unresolveReviewThread";
    await octokit.graphql(
      `mutation($threadId: ID!) {
        ${mutation}(input: { threadId: $threadId }) {
          thread { id }
        }
      }`,
      { threadId },
    );
  }

  const threadActions: ThreadAction[] = Array.isArray(review.thread_actions)
    ? review.thread_actions
    : [];
  let skippedThreadActions = 0;
  for (const action of threadActions) {
    const currentThreadState = currentThreadStates?.get(action.thread_id);
    if (currentThreadStates && !currentThreadState) {
      logger.warning(
        `Skipping TeXRA thread action ${action.action}: thread id ${action.thread_id} was not found in the previous TeXRA thread context.`,
      );
      continue;
    }
    try {
      if (action.action === "reply") {
        if (!resolveThreads) {
          skippedThreadActions += 1;
          continue;
        }
        await replyToThread(action.thread_id, action.body);
      } else if (action.action === "resolve") {
        if (currentThreadState?.isResolved === true) continue;
        if (!resolveThreads) {
          skippedThreadActions += 1;
          continue;
        }
        if (action.body) await replyToThread(action.thread_id, action.body);
        await setThreadResolved(action.thread_id, true);
        if (currentThreadState) currentThreadState.isResolved = true;
      } else if (action.action === "unresolve") {
        if (currentThreadState?.isResolved === false) continue;
        if (!resolveThreads) {
          skippedThreadActions += 1;
          continue;
        }
        if (action.body) await replyToThread(action.thread_id, action.body);
        await setThreadResolved(action.thread_id, false);
        if (currentThreadState) currentThreadState.isResolved = false;
      }
    } catch (error) {
      logger.warning(
        `Could not apply TeXRA thread action ${action.action} for ${action.thread_id}: ${errorMessage(
          error,
        )}`,
      );
    }
  }
  if (skippedThreadActions > 0) {
    logger.notice(
      `Skipped ${skippedThreadActions} TeXRA review-thread action(s). Configure a dedicated github-token (e.g. TEXRA_REVIEW_GITHUB_TOKEN) to post previous-thread follow-ups as the TeXRA GitHub identity.`,
    );
  }
}
