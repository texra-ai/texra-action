import { describe, expect, it } from "bun:test";
import {
  fileReferencesText,
  promptContextText,
} from "../src/review/promptContext";

describe("promptContextText", () => {
  it("renders all labelled fields, ending with a newline", () => {
    const text = promptContextText({
      prNumber: "42",
      repository: "o/r",
      repositoryOwner: "o",
      repositoryName: "r",
      prTitleJson: '"Title"',
      prBodyJson: '"Body"',
      baseRef: "main",
      baseSha: "b",
      headRef: "feat",
      headSha: "h",
      triggerEvent: "opened",
      reviewMode: "external",
      reviewModel: "opus48T",
    });
    expect(text).toContain("PR number: 42");
    expect(text).toContain('Pull request title JSON (untrusted): "Title"');
    expect(text).toContain("TeXRA review model: opus48T");
    expect(text.endsWith("\n")).toBe(true);
  });
});

describe("fileReferencesText", () => {
  it("lists only non-empty refs", () => {
    expect(
      fileReferencesText({ reviewContextFile: ".texra-action/pr.diff" }),
    ).toBe("Review context file: `.texra-action/pr.diff`\n");
    expect(fileReferencesText({})).toBe("");
  });
});
