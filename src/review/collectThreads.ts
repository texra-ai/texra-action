import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { errorMessage, type Octokit } from "../lib/octokit";

export interface ThreadComment {
  id: string;
  author: string | null;
  createdAt: string;
  url: string;
  path: string;
  line: number | null;
  diffHunk: string;
  body: string;
}

export interface ReviewThread {
  id: string;
  isResolved: boolean;
  comments: ThreadComment[];
}

export interface ThreadsPayload {
  marker: string;
  threads: ReviewThread[];
  note?: string;
}

export interface Logger {
  warning(message: string): void;
}

interface GraphqlComment {
  id: string;
  body: string | null;
  author: { login: string } | null;
  createdAt: string;
  url: string;
  path: string;
  line: number | null;
  diffHunk: string;
}

interface GraphqlThread {
  id: string;
  isResolved: boolean;
  comments: { pageInfo: { hasNextPage: boolean }; nodes: GraphqlComment[] };
}

interface ThreadsQueryResult {
  repository: {
    pullRequest: {
      reviewThreads: {
        pageInfo: { hasNextPage: boolean };
        nodes: GraphqlThread[];
      };
    } | null;
  } | null;
}

const REVIEW_THREADS_QUERY = `
  query($owner: String!, $repo: String!, $number: Int!) {
    repository(owner: $owner, name: $repo) {
      pullRequest(number: $number) {
        reviewThreads(first: 100) {
          pageInfo { hasNextPage }
          nodes {
            id
            isResolved
            comments(first: 20) {
              pageInfo { hasNextPage }
              nodes {
                id
                body
                author { login }
                createdAt
                url
                path
                line
                diffHunk
              }
            }
          }
        }
      }
    }
  }
`;

/**
 * Read the PR's existing review threads and keep only those whose comments carry
 * the TeXRA marker, so the agent can decide what to resolve / reply to. Failures
 * degrade to an empty payload rather than breaking the review.
 */
export async function collectTexraThreads(opts: {
  octokit: Octokit;
  owner: string;
  repo: string;
  prNumber: number;
  marker: string;
  outputPath: string;
  logger: Logger;
}): Promise<ThreadsPayload> {
  const { octokit, owner, repo, prNumber, marker, outputPath, logger } = opts;
  const emptyPayload: ThreadsPayload = {
    marker,
    threads: [],
    note: "No previous TeXRA review threads were found.",
  };

  mkdirSync(dirname(outputPath), { recursive: true });

  let data: ThreadsQueryResult;
  try {
    data = await octokit.graphql<ThreadsQueryResult>(REVIEW_THREADS_QUERY, {
      owner,
      repo,
      number: prNumber,
    });
  } catch (error) {
    logger.warning(
      `Could not read previous TeXRA review threads: ${errorMessage(error)}`,
    );
    writeFileSync(outputPath, `${JSON.stringify(emptyPayload, null, 2)}\n`);
    return emptyPayload;
  }

  const reviewThreads = data.repository?.pullRequest?.reviewThreads;
  if (!reviewThreads) {
    logger.warning("Previous TeXRA review thread data was unavailable.");
    writeFileSync(outputPath, `${JSON.stringify(emptyPayload, null, 2)}\n`);
    return emptyPayload;
  }
  if (reviewThreads.pageInfo.hasNextPage) {
    logger.warning(
      "Only the first 100 previous TeXRA review threads were read.",
    );
  }
  for (const thread of reviewThreads.nodes) {
    if (thread.comments.pageInfo.hasNextPage) {
      logger.warning(
        `Only the first 20 comments were read for TeXRA review thread ${thread.id}.`,
      );
    }
  }

  const threads: ReviewThread[] = reviewThreads.nodes
    .filter((thread) =>
      thread.comments.nodes.some((comment) =>
        String(comment.body || "").includes(marker),
      ),
    )
    .map((thread) => ({
      id: thread.id,
      isResolved: thread.isResolved,
      comments: thread.comments.nodes.map((comment) => ({
        id: comment.id,
        author: comment.author?.login ?? null,
        createdAt: comment.createdAt,
        url: comment.url,
        path: comment.path,
        line: comment.line,
        diffHunk: comment.diffHunk,
        body: String(comment.body || "")
          .replaceAll(marker, "")
          .trim(),
      })),
    }));

  const payload: ThreadsPayload = { marker, threads };
  writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
  return payload;
}
