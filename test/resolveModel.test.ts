import { describe, expect, it } from "bun:test";
import {
  resolveReviewModel,
  resolveReviewModelFromEnv,
} from "../src/review/resolveModel";

describe("resolveReviewModel", () => {
  it("uses an explicitly configured model", () => {
    expect(
      resolveReviewModel({ configuredModel: "opus48T", providerKeys: {} }),
    ).toEqual({ model: "opus48T", source: "configured" });
  });

  it("picks the first provider with a key, in precedence order", () => {
    expect(
      resolveReviewModel({
        providerKeys: { anthropic: "sk-ant", openai: "sk-oai" },
      }),
    ).toEqual({ model: "opus48T", source: "anthropic" });
  });

  it("prefers deepseek when several keys are present", () => {
    expect(
      resolveReviewModel({
        providerKeys: { deepseek: "k", anthropic: "k" },
      }),
    ).toEqual({ model: "deepseekproT", source: "deepseek" });
  });

  it("honors per-provider model overrides", () => {
    expect(
      resolveReviewModel({
        providerKeys: { openai: "k" },
        providerModels: { openai: "gpt5mini" },
      }),
    ).toEqual({ model: "gpt5mini", source: "openai" });
  });

  it("honors default-model overrides", () => {
    expect(
      resolveReviewModel({
        providerKeys: { xai: "k" },
        defaultModels: { xai: "grok4fast" },
      }),
    ).toEqual({ model: "grok4fast", source: "xai" });
  });

  it("falls back to the deepseek default with no keys", () => {
    expect(resolveReviewModel({})).toEqual({
      model: "deepseekproT",
      source: "default",
    });
  });

  it("resolves a default for the newer providers", () => {
    expect(resolveReviewModel({ providerKeys: { moonshot: "k" } })).toEqual({
      model: "kimi26T",
      source: "moonshot",
    });
    expect(resolveReviewModel({ providerKeys: { glm: "k" } })).toEqual({
      model: "glm51",
      source: "glm",
    });
  });
});

describe("resolveReviewModelFromEnv", () => {
  it("reads keys, models, and JSON default overrides from env", () => {
    const result = resolveReviewModelFromEnv({
      OPENAI_API_KEY: "k",
      TEXRA_REVIEW_MODEL_DEFAULTS: '{"openai":"gpt55mini"}',
    } as NodeJS.ProcessEnv);
    expect(result).toEqual({ model: "gpt55mini", source: "openai" });
  });

  it("ignores malformed default overrides", () => {
    const result = resolveReviewModelFromEnv({
      ANTHROPIC_API_KEY: "k",
      TEXRA_REVIEW_MODEL_DEFAULTS: "not json",
    } as NodeJS.ProcessEnv);
    expect(result).toEqual({ model: "opus48T", source: "anthropic" });
  });
});
