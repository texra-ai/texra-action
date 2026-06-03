import { describe, expect, it } from "bun:test";
import { parseCliArgs } from "../src/lib/cliArgs";

describe("parseCliArgs", () => {
  it("returns an empty array for blank input", () => {
    expect(parseCliArgs("")).toEqual([]);
    expect(parseCliArgs(undefined)).toEqual([]);
  });

  it("parses a JSON array", () => {
    expect(parseCliArgs('["--max-turns","12"]')).toEqual(["--max-turns", "12"]);
  });

  it("splits a shell-style string", () => {
    expect(parseCliArgs("--max-turns 12 --verbose")).toEqual([
      "--max-turns",
      "12",
      "--verbose",
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
