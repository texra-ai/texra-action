/**
 * Single source of truth for the AI providers TeXRA supports. Drives the action
 * input names, the environment variables the CLI subprocess reads, and the
 * review-model defaults — add a provider here and the input, the key passthrough,
 * and model resolution all follow. Ids match the CLI's API_KEY_PROVIDER_IDS.
 */
export interface ProviderSpec {
  id: string;
  /** Environment variable the CLI reads the key from (`<ID>_API_KEY`). */
  envVar: string;
  /** Hyphenated action input name. */
  inputKey: string;
  /** Default review model short-id for this provider. */
  reviewDefaultModel: string;
}

export const PROVIDERS: ProviderSpec[] = [
  {
    id: "deepseek",
    envVar: "DEEPSEEK_API_KEY",
    inputKey: "deepseek-api-key",
    reviewDefaultModel: "deepseekproT",
  },
  {
    id: "anthropic",
    envVar: "ANTHROPIC_API_KEY",
    inputKey: "anthropic-api-key",
    reviewDefaultModel: "opus48T",
  },
  {
    id: "openai",
    envVar: "OPENAI_API_KEY",
    inputKey: "openai-api-key",
    reviewDefaultModel: "gpt55",
  },
  {
    id: "google",
    envVar: "GOOGLE_API_KEY",
    inputKey: "google-api-key",
    reviewDefaultModel: "gemini31p",
  },
  {
    id: "openRouter",
    envVar: "OPENROUTER_API_KEY",
    inputKey: "openrouter-api-key",
    reviewDefaultModel: "gptoss",
  },
  {
    id: "xai",
    envVar: "XAI_API_KEY",
    inputKey: "xai-api-key",
    reviewDefaultModel: "grok4",
  },
  {
    id: "moonshot",
    envVar: "MOONSHOT_API_KEY",
    inputKey: "moonshot-api-key",
    reviewDefaultModel: "kimi26T",
  },
  {
    id: "dashscope",
    envVar: "DASHSCOPE_API_KEY",
    inputKey: "dashscope-api-key",
    reviewDefaultModel: "qwenplus",
  },
  {
    id: "minimax",
    envVar: "MINIMAX_API_KEY",
    inputKey: "minimax-api-key",
    reviewDefaultModel: "minimaxM27",
  },
  {
    id: "glm",
    envVar: "GLM_API_KEY",
    inputKey: "glm-api-key",
    reviewDefaultModel: "glm51",
  },
];

/** Map provider id -> configured key value (from the parsed action inputs). */
export function providerKeysFromInputs(
  inputs: Record<string, string>,
): Record<string, string> {
  return Object.fromEntries(
    PROVIDERS.map((p) => [p.id, inputs[p.inputKey] ?? ""]),
  );
}

/**
 * Environment overrides (`<PROVIDER>_API_KEY`) to merge into the CLI subprocess
 * environment, for the providers whose key is configured.
 */
export function providerEnv(
  providerKeys: Record<string, string>,
): Record<string, string> {
  const env: Record<string, string> = {};
  for (const provider of PROVIDERS) {
    const value = providerKeys[provider.id];
    if (value) env[provider.envVar] = value;
  }
  return env;
}
