import { describe, expect, test } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { isStatusOnlyMessage, loadCliResult } from "../src/lib/cliResult";

function writeResult(payload: unknown): string {
  const dir = mkdtempSync(join(tmpdir(), "texra-cli-result-"));
  const file = join(dir, "result.json");
  writeFileSync(file, JSON.stringify(payload));
  return file;
}

describe("loadCliResult", () => {
  test("reads the canonical response field", () => {
    const file = writeResult({
      result: {
        category: "toolUse",
        outcome: "completed",
        response: " Review body. ",
      },
    });
    expect(loadCliResult(file).finalMessage).toBe("Review body.");
  });

  test("falls back to the legacy lastResponse field", () => {
    const file = writeResult({
      result: {
        category: "toolUse",
        outcome: "completed",
        lastResponse: "Legacy body.",
      },
    });
    expect(loadCliResult(file).finalMessage).toBe("Legacy body.");
  });

  test("prefers response over a stale legacy alias", () => {
    const file = writeResult({
      result: { response: "Canonical.", lastResponse: "Legacy." },
    });
    expect(loadCliResult(file).finalMessage).toBe("Canonical.");
  });

  test("handles an unwrapped result object", () => {
    const file = writeResult({ response: "Unwrapped." });
    expect(loadCliResult(file).finalMessage).toBe("Unwrapped.");
  });

  test("returns an empty finalMessage when neither field is present", () => {
    const file = writeResult({ result: { outcome: "completed" } });
    expect(loadCliResult(file).finalMessage).toBe("");
  });

  test("folds the legacy touchedFiles alias into files", () => {
    const file = writeResult({
      result: { response: "r", touchedFiles: ["a.ts"] },
    });
    expect(loadCliResult(file).result.files).toEqual(["a.ts"]);
  });

  test("surfaces native structured output", () => {
    const file = writeResult({
      result: { response: "r", structured: { body: "Review." } },
    });
    expect(loadCliResult(file).structured).toEqual({ body: "Review." });
  });

  test("leaves structured undefined when the agent produced none", () => {
    const file = writeResult({ result: { response: "r" } });
    expect(loadCliResult(file).structured).toBeUndefined();
  });

  test("rejects a result whose fields have the wrong types", () => {
    const file = writeResult({ result: { response: 42 } });
    expect(() => loadCliResult(file)).toThrow(/expected CLI result shape/);
  });

  test("rejects a wrapped payload whose result is not an object", () => {
    const file = writeResult({ result: "nope" });
    expect(() => loadCliResult(file)).toThrow(/expected CLI result shape/);
  });
});

describe("isStatusOnlyMessage", () => {
  test("matches short acknowledgements case-insensitively", () => {
    expect(isStatusOnlyMessage(" Done ")).toBe(true);
    expect(isStatusOnlyMessage("A real review sentence.")).toBe(false);
  });
});
