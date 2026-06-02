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

  it("respects quotes", () => {
    expect(parseCliArgs('--note "hello world" --flag')).toEqual([
      "--note",
      "hello world",
      "--flag",
    ]);
  });
});
