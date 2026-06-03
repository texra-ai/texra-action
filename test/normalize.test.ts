import { describe, expect, it } from "bun:test";
import {
  DEFAULT_REVIEW_BODY,
  dedupeThreadActions,
  normalizeModelComment,
  normalizeReview,
  normalizeThreadAction,
} from "../src/review/normalize";

describe("normalizeModelComment", () => {
  it("keeps a valid line comment and defaults side to RIGHT", () => {
    expect(normalizeModelComment({ path: "a.ts", body: "x", line: 4 })).toEqual(
      { path: "a.ts", body: "x", line: 4, side: "RIGHT" },
    );
  });

  it("supports start_line/start_side multi-line comments", () => {
    expect(
      normalizeModelComment({
        path: "a.ts",
        body: "x",
        line: 8,
        side: "LEFT",
        start_line: 5,
        start_side: "LEFT",
      }),
    ).toEqual({
      path: "a.ts",
      body: "x",
      line: 8,
      side: "LEFT",
      start_line: 5,
      start_side: "LEFT",
    });
  });

  it("keeps a position-based comment without a line", () => {
    expect(
      normalizeModelComment({ path: "a.ts", body: "x", position: 3 }),
    ).toEqual({ path: "a.ts", body: "x", position: 3 });
  });

  it("drops comments missing path/body/anchor", () => {
    expect(normalizeModelComment({ path: "a.ts", body: "x" })).toBeUndefined();
    expect(normalizeModelComment({ body: "x", line: 1 })).toBeUndefined();
    expect(normalizeModelComment(null)).toBeUndefined();
  });
});

describe("normalizeThreadAction", () => {
  it("requires a body for replies", () => {
    expect(
      normalizeThreadAction({ action: "reply", thread_id: "T1" }),
    ).toBeUndefined();
    expect(
      normalizeThreadAction({ action: "reply", thread_id: "T1", body: "ok" }),
    ).toEqual({ action: "reply", thread_id: "T1", body: "ok" });
  });

  it("accepts resolve/unresolve without a body", () => {
    expect(
      normalizeThreadAction({ action: "resolve", threadId: "T2" }),
    ).toEqual({ action: "resolve", thread_id: "T2" });
  });

  it("rejects unknown actions", () => {
    expect(
      normalizeThreadAction({ action: "delete", thread_id: "T3" }),
    ).toBeUndefined();
  });
});

describe("dedupeThreadActions", () => {
  it("prefers the variant that carries a body", () => {
    const result = dedupeThreadActions([
      { action: "resolve", thread_id: "T1" },
      { action: "resolve", thread_id: "T1", body: "reason" },
    ]);
    expect(result).toEqual([
      { action: "resolve", thread_id: "T1", body: "reason" },
    ]);
  });
});

describe("normalizeReview", () => {
  it("treats non-JSON as the review body", () => {
    expect(normalizeReview("just prose")).toEqual({
      body: "just prose",
      comments: [],
      thread_actions: [],
    });
  });

  it("normalizes a full payload and maps legacy aliases", () => {
    const review = normalizeReview(
      JSON.stringify({
        body: "## TeXRA Code Review",
        comments: [{ path: "a.ts", body: "c", line: 2 }],
        thread_replies: [{ thread_id: "T1", body: "reply" }],
        resolved_threads: [{ thread_id: "T2" }],
      }),
    );
    expect(review.body).toBe("## TeXRA Code Review");
    expect(review.comments).toEqual([
      { path: "a.ts", body: "c", line: 2, side: "RIGHT" },
    ]);
    expect(review.thread_actions).toEqual([
      { action: "reply", thread_id: "T1", body: "reply" },
      { action: "resolve", thread_id: "T2" },
    ]);
  });

  it("falls back to a default body when missing", () => {
    expect(normalizeReview(JSON.stringify({ comments: [] })).body).toBe(
      DEFAULT_REVIEW_BODY,
    );
  });

  it("caps comments and thread actions at 50", () => {
    const comments = Array.from({ length: 60 }, (_, i) => ({
      path: "a.ts",
      body: "c",
      line: i + 1,
    }));
    expect(
      normalizeReview(JSON.stringify({ body: "b", comments })).comments,
    ).toHaveLength(50);
  });
});

describe("schema coercion edge cases", () => {
  it("drops an invalid side and defaults to RIGHT", () => {
    expect(
      normalizeModelComment({ path: "a.ts", body: "x", line: 1, side: "MID" }),
    ).toEqual({ path: "a.ts", body: "x", line: 1, side: "RIGHT" });
  });

  it("drops a comment whose line is non-integer and has no position", () => {
    expect(
      normalizeModelComment({ path: "a.ts", body: "x", line: 4.5 }),
    ).toBeUndefined();
  });

  it("trims a whitespaced action kind", () => {
    expect(
      normalizeThreadAction({ action: " resolve ", thread_id: "T1" }),
    ).toEqual({ action: "resolve", thread_id: "T1" });
  });
});
