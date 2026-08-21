import { describe, expect, it } from "bun:test";
import { buildAgentArgs, parseCliArgs } from "../src/lib/cliArgs";

describe("parseCliArgs", () => {
  it("returns an empty array for blank input", () => {
    expect(parseCliArgs("")).toEqual([]);
    expect(parseCliArgs(undefined)).toEqual([]);
  });

  it("parses a JSON array", () => {
    expect(parseCliArgs('["--no-color"]')).toEqual(["--no-color"]);
  });

  it("splits a shell-style string", () => {
    expect(parseCliArgs("--no-color --quiet")).toEqual([
      "--no-color",
      "--quiet",
    ]);
  });

  it("respects double quotes", () => {
    expect(parseCliArgs('--note "hello world" --flag')).toEqual([
      "--note",
      "hello world",
      "--flag",
    ]);
  });

  it("respects single quotes and collapses extra whitespace", () => {
    expect(parseCliArgs("  --note 'hello world'   --flag  ")).toEqual([
      "--note",
      "hello world",
      "--flag",
    ]);
  });

  it("falls back to shell-splitting a malformed JSON-array value", () => {
    expect(parseCliArgs("[broken --flag")).toEqual(["[broken", "--flag"]);
  });
});

describe("buildAgentArgs", () => {
  it("builds the action's CLI argument list", () => {
    const args = buildAgentArgs(
      {
        agent: "review",
        approvalPolicy: "yolo",
        outputFormat: "json",
      },
      ".texra/prompt.md",
      "/workspace",
      "opus48T",
      ["pr.diff", "threads.json"],
      ["--no-color"],
    );

    expect(args).toEqual([
      "agents",
      "run",
      "review",
      "--instruction-file",
      ".texra/prompt.md",
      "--cwd",
      "/workspace",
      "--approval-policy",
      "yolo",
      "--output-format",
      "json",
      "--print",
      "--model",
      "opus48T",
      "--context",
      "pr.diff",
      "--context",
      "threads.json",
      "--no-color",
    ]);
    expect(args).not.toContain("--api-mode");
  });
});
