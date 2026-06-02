import { describe, expect, it } from "bun:test";
import {
  parseCommentableLines,
  toMarkdown,
} from "../src/review/commentableLines";

const DIFF = `diff --git a/src/foo.ts b/src/foo.ts
index 111..222 100644
--- a/src/foo.ts
+++ b/src/foo.ts
@@ -1,3 +1,4 @@
 const a = 1;
-const b = 2;
+const b = 3;
+const c = 4;
 const d = 5;
`;

describe("parseCommentableLines", () => {
  it("collects RIGHT anchors for added/context lines and LEFT for removals", () => {
    const result = parseCommentableLines(DIFF);
    expect(result.files).toHaveLength(1);
    const file = result.files[0]!;
    expect(file.path).toBe("src/foo.ts");
    // Only changed lines anchor: added `const b = 3;`/`const c = 4;` at new 2-3.
    // Context lines are intentionally NOT commentable.
    expect(file.right).toEqual([{ start: 2, end: 3 }]);
    // LEFT line: removed `const b = 2;` at old line 2
    expect(file.left).toEqual([{ start: 2, end: 2 }]);
  });

  it("renders Markdown with RIGHT/LEFT ranges", () => {
    const md = toMarkdown(parseCommentableLines(DIFF));
    expect(md).toContain("## src/foo.ts");
    expect(md).toContain("- RIGHT: 2-3");
    expect(md).toContain("- LEFT: 2");
  });

  it("returns no files for an empty diff", () => {
    expect(parseCommentableLines("").files).toEqual([]);
  });
});
