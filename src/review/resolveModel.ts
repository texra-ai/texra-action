import { PROVIDERS } from "../lib/providers";

/**
 * Resolve which TeXRA model the review should run with.
 *
 * Precedence: an explicitly configured model wins; otherwise the first provider
 * (in `PROVIDERS` order) that has an API key configured selects its default
 * review model. Defaults come from the single provider table and can be
 * overridden per-provider via the `model-defaults` JSON map.
 */
export interface ResolvedReviewModel {
  model: string;
  source: string;
}

function nonEmpty(value: string | undefined): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export interface ResolveReviewModelInput {
  configuredModel?: string;
  providerKeys?: Record<string, string | undefined>;
  /** Per-provider default short-id overrides (from `model-defaults`). */
  defaultModels?: Record<string, string | undefined>;
}

export function resolveReviewModel(
  input: ResolveReviewModelInput = {},
): ResolvedReviewModel {
  const { configuredModel, providerKeys = {}, defaultModels = {} } = input;

  const explicit = nonEmpty(configuredModel);
  if (explicit) return { model: explicit, source: "configured" };

  const defaultFor = (id: string, fallback: string): string =>
    nonEmpty(defaultModels[id]) ?? fallback;

  for (const provider of PROVIDERS) {
    if (!nonEmpty(providerKeys[provider.id])) continue;
    return {
      model: defaultFor(provider.id, provider.reviewDefaultModel),
      source: provider.id,
    };
  }

  const fallbackProvider = PROVIDERS[0];
  return {
    model: defaultFor(fallbackProvider.id, fallbackProvider.reviewDefaultModel),
    source: "default",
  };
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

export function resolveReviewModelFromConfig(config: {
  model: string;
  modelDefaults: string;
  providerKeys: Record<string, string>;
}): ResolvedReviewModel {
  return resolveReviewModel({
    configuredModel: config.model,
    providerKeys: config.providerKeys,
    defaultModels: parseDefaultModels(config.modelDefaults),
  });
}
