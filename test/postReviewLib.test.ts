import { describe, expect, it } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  fallbackItems,
  formatReviewComment,
  isCommentable,
  loadCommentableLines,
  loadKnownThreadStates,
  markedBody,
  reviewAttributionFooter,
  type CommentableMap,
  type FormattedComment,
} from "../src/review/postReviewLib";

function commentable(
  path: string,
  right: number[],
  left: number[] = [],
): CommentableMap {
  return new Map([[path, { RIGHT: new Set(right), LEFT: new Set(left) }]]);
}

describe("markedBody", () => {
  it("prefixes the marker", () => {
    expect(markedBody("hello", "<!-- m -->")).toBe("<!-- m -->\nhello");
  });
  it("fills a default when empty", () => {
    expect(markedBody("", "<!-- m -->")).toContain("## TeXRA Code Review");
  });
});

describe("formatReviewComment", () => {
  it("carries line/side and markers the body", () => {
    const formatted = formatReviewComment(
      { path: "a.ts", body: "x", line: 3, side: "RIGHT" },
      "<!-- m -->",
    );
    expect(formatted.line).toBe(3);
    expect(formatted.side).toBe("RIGHT");
    expect(formatted.body).toBe("<!-- m -->\nx");
  });
});

describe("isCommentable", () => {
  const lines = commentable("a.ts", [3, 4, 5], [10]);

  it("accepts a position-based comment unconditionally", () => {
    expect(isCommentable({ path: "a.ts", body: "x", position: 2 }, lines)).toBe(
      true,
    );
  });

  it("accepts a line present in the RIGHT anchors", () => {
    const c: FormattedComment = {
      path: "a.ts",
      body: "x",
      line: 4,
      side: "RIGHT",
    };
    expect(isCommentable(c, lines)).toBe(true);
  });

  it("rejects a line outside the anchors", () => {
    const c: FormattedComment = {
      path: "a.ts",
      body: "x",
      line: 99,
      side: "RIGHT",
    };
    expect(isCommentable(c, lines)).toBe(false);
  });

  it("validates start_line for multi-line comments", () => {
    const ok: FormattedComment = {
      path: "a.ts",
      body: "x",
      line: 5,
      side: "RIGHT",
      start_line: 3,
      start_side: "RIGHT",
    };
    const bad: FormattedComment = { ...ok, start_line: 1 };
    expect(isCommentable(ok, lines)).toBe(true);
    expect(isCommentable(bad, lines)).toBe(false);
  });

  it("accepts everything when no anchors are known", () => {
    expect(isCommentable({ path: "a.ts", body: "x", line: 1 }, null)).toBe(
      true,
    );
  });
});

describe("fallbackItems / footer", () => {
  it("lists unplaced comments and strips the marker", () => {
    const items = fallbackItems(
      [{ path: "a.ts", body: "<!-- m -->\nfinding", line: 7 }],
      "<!-- m -->",
    );
    expect(items).toBe("- `a.ts`:7: finding");
  });

  it("builds an attribution footer", () => {
    expect(
      reviewAttributionFooter({ agent: "review", model: "opus48T" }),
    ).toContain("agent `review` with model `opus48T`");
    expect(reviewAttributionFooter({})).toBe("");
  });
});

describe("loadCommentableLines / loadKnownThreadStates resilience", () => {
  const dir = mkdtempSync(join(tmpdir(), "texra-action-test-"));

  it("returns null for an absent file", () => {
    expect(loadCommentableLines(join(dir, "missing.json"))).toBeNull();
    expect(loadKnownThreadStates(join(dir, "missing.json"))).toBeNull();
  });

  it("returns null for malformed JSON instead of throwing", () => {
    const bad = join(dir, "bad.json");
    writeFileSync(bad, "{ not valid json");
    expect(loadCommentableLines(bad)).toBeNull();
    expect(loadKnownThreadStates(bad)).toBeNull();
  });

  it("parses valid anchors and thread states", () => {
    const anchors = join(dir, "anchors.json");
    writeFileSync(
      anchors,
      JSON.stringify({
        files: [{ path: "a.ts", right: [{ start: 2, end: 3 }], left: [] }],
      }),
    );
    expect(loadCommentableLines(anchors)?.get("a.ts")?.RIGHT.has(3)).toBe(true);

    const threads = join(dir, "threads.json");
    writeFileSync(
      threads,
      JSON.stringify({ threads: [{ id: "T1", isResolved: true }] }),
    );
    expect(loadKnownThreadStates(threads)?.get("T1")?.isResolved).toBe(true);
  });
});
