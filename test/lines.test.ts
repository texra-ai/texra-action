import { describe, expect, it } from "bun:test";
import { splitLines } from "../src/lib/lines";

describe("splitLines", () => {
  it("returns an empty array for blank or missing input", () => {
    expect(splitLines("")).toEqual([]);
    expect(splitLines(undefined)).toEqual([]);
    expect(splitLines("\n  \n\t\n")).toEqual([]);
  });

  it("splits on LF and CRLF, trimming each entry", () => {
    expect(splitLines("a\nb\r\n  c  \n")).toEqual(["a", "b", "c"]);
  });

  it("drops empty lines", () => {
    expect(splitLines("a\n\n\nb")).toEqual(["a", "b"]);
  });
});
