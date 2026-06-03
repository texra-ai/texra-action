import { describe, expect, it } from "bun:test";
import { fencedJsonBlocks, parseModelJson } from "../src/lib/parseModelJson";

describe("parseModelJson", () => {
  it("parses a bare JSON object", () => {
    expect(parseModelJson('{"a":1}')).toEqual({ a: 1 });
  });

  it("extracts JSON from a ```json fence", () => {
    const text = 'Here is the result:\n```json\n{"body":"hi"}\n```\n';
    expect(parseModelJson(text)).toEqual({ body: "hi" });
  });

  it("extracts JSON from a bare fence", () => {
    const text = '```\n{"x":true}\n```';
    expect(parseModelJson(text)).toEqual({ x: true });
  });

  it("falls back to the outermost brace span", () => {
    const text = 'prose before {"k":[1,2,3]} prose after';
    expect(parseModelJson(text)).toEqual({ k: [1, 2, 3] });
  });

  it("returns undefined when no JSON is present", () => {
    expect(parseModelJson("no json here")).toBeUndefined();
  });

  it("finds multiple fenced blocks", () => {
    const text = '```json\nnot valid\n```\n```json\n{"ok":1}\n```';
    expect(fencedJsonBlocks(text)).toHaveLength(2);
    expect(parseModelJson(text)).toEqual({ ok: 1 });
  });
});
