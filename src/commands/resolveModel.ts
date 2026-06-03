import * as core from "@actions/core";
import { readInputs } from "../lib/inputs";
import { resolveReviewModelFromConfig } from "../review/resolveModel";

/** Pick the review model from the configured model / available provider keys. */
export async function run(): Promise<void> {
  const inputs = readInputs();
  const { model, source } = resolveReviewModelFromConfig({
    model: inputs.model,
    modelDefaults: inputs.modelDefaults,
    providerKeys: inputs.providerKeys,
  });
  core.setOutput("model", model);
  core.setOutput("source", source);
  core.info(`Resolved TeXRA review model ${model} from ${source}.`);
}
