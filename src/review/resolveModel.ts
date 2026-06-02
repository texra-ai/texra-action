/**
 * Resolve which TeXRA model the review should run with.
 *
 * Precedence: an explicitly configured model wins; otherwise the first provider
 * (in `REVIEW_PROVIDER_CONFIGS` order) that has an API key configured selects a
 * default short-id, which the consumer can override per-provider. The built-in
 * defaults are TeXRA's recommended review models but are fully overridable via
 * `TEXRA_REVIEW_<PROVIDER>_MODEL` or the `TEXRA_REVIEW_MODEL_DEFAULTS` JSON map.
 */
export interface ReviewProviderConfig {
  provider: string;
  keyEnv: string;
  modelEnv: string;
  defaultModel: string;
}

export const REVIEW_PROVIDER_CONFIGS: ReviewProviderConfig[] = [
  {
    provider: "deepseek",
    keyEnv: "DEEPSEEK_API_KEY",
    modelEnv: "TEXRA_REVIEW_DEEPSEEK_MODEL",
    defaultModel: "deepseekproT",
  },
  {
    provider: "anthropic",
    keyEnv: "ANTHROPIC_API_KEY",
    modelEnv: "TEXRA_REVIEW_ANTHROPIC_MODEL",
    defaultModel: "opus48T",
  },
  {
    provider: "openai",
    keyEnv: "OPENAI_API_KEY",
    modelEnv: "TEXRA_REVIEW_OPENAI_MODEL",
    defaultModel: "gpt55",
  },
  {
    provider: "google",
    keyEnv: "GOOGLE_API_KEY",
    modelEnv: "TEXRA_REVIEW_GOOGLE_MODEL",
    defaultModel: "gemini31p",
  },
  {
    provider: "openRouter",
    keyEnv: "OPENROUTER_API_KEY",
    modelEnv: "TEXRA_REVIEW_OPENROUTER_MODEL",
    defaultModel: "gptoss",
  },
  {
    provider: "xai",
    keyEnv: "XAI_API_KEY",
    modelEnv: "TEXRA_REVIEW_XAI_MODEL",
    defaultModel: "grok4",
  },
  {
    provider: "moonshot",
    keyEnv: "MOONSHOT_API_KEY",
    modelEnv: "TEXRA_REVIEW_MOONSHOT_MODEL",
    defaultModel: "kimi26T",
  },
  {
    provider: "dashscope",
    keyEnv: "DASHSCOPE_API_KEY",
    modelEnv: "TEXRA_REVIEW_DASHSCOPE_MODEL",
    defaultModel: "qwenplus",
  },
  {
    provider: "minimax",
    keyEnv: "MINIMAX_API_KEY",
    modelEnv: "TEXRA_REVIEW_MINIMAX_MODEL",
    defaultModel: "minimaxM27",
  },
  {
    provider: "glm",
    keyEnv: "GLM_API_KEY",
    modelEnv: "TEXRA_REVIEW_GLM_MODEL",
    defaultModel: "glm51",
  },
];

export const REVIEW_MODEL_PROVIDER_ORDER = REVIEW_PROVIDER_CONFIGS.map(
  (config) => config.provider,
);

export const DEFAULT_REVIEW_MODEL_BY_PROVIDER: Record<string, string> =
  Object.fromEntries(
    REVIEW_PROVIDER_CONFIGS.map((config) => [
      config.provider,
      config.defaultModel,
    ]),
  );

function nonEmpty(value: string | undefined): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export interface ResolveReviewModelInput {
  configuredModel?: string;
  providerKeys?: Record<string, string | undefined>;
  providerModels?: Record<string, string | undefined>;
  /** Per-provider default short-id overrides (from TEXRA_REVIEW_MODEL_DEFAULTS). */
  defaultModels?: Record<string, string | undefined>;
}

export interface ResolvedReviewModel {
  model: string;
  source: string;
}

export function resolveReviewModel(
  input: ResolveReviewModelInput = {},
): ResolvedReviewModel {
  const {
    configuredModel,
    providerKeys = {},
    providerModels = {},
    defaultModels = {},
  } = input;

  const explicitModel = nonEmpty(configuredModel);
  if (explicitModel) return { model: explicitModel, source: "configured" };

  const defaultFor = (provider: string): string =>
    nonEmpty(defaultModels[provider]) ??
    DEFAULT_REVIEW_MODEL_BY_PROVIDER[provider] ??
    DEFAULT_REVIEW_MODEL_BY_PROVIDER.deepseek!;

  for (const config of REVIEW_PROVIDER_CONFIGS) {
    if (!nonEmpty(providerKeys[config.provider])) continue;
    return {
      model:
        nonEmpty(providerModels[config.provider]) ??
        defaultFor(config.provider),
      source: config.provider,
    };
  }

  return { model: defaultFor("deepseek"), source: "default" };
}

function parseDefaultModels(
  raw: string | undefined,
): Record<string, string | undefined> {
  if (!raw || !raw.trim()) return {};
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, string>;
    }
  } catch {
    // Ignore malformed overrides and fall back to built-in defaults.
  }
  return {};
}

export function resolveReviewModelFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): ResolvedReviewModel {
  return resolveReviewModel({
    configuredModel: env.TEXRA_REVIEW_MODEL,
    providerKeys: Object.fromEntries(
      REVIEW_PROVIDER_CONFIGS.map((config) => [
        config.provider,
        env[config.keyEnv],
      ]),
    ),
    providerModels: Object.fromEntries(
      REVIEW_PROVIDER_CONFIGS.map((config) => [
        config.provider,
        env[config.modelEnv],
      ]),
    ),
    defaultModels: parseDefaultModels(env.TEXRA_REVIEW_MODEL_DEFAULTS),
  });
}
