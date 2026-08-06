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
});

describe("isStatusOnlyMessage", () => {
  test("matches short acknowledgements case-insensitively", () => {
    expect(isStatusOnlyMessage(" Done ")).toBe(true);
    expect(isStatusOnlyMessage("A real review sentence.")).toBe(false);
  });
});
