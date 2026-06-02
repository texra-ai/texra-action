import * as core from "@actions/core";
import { resolveReviewModelFromEnv } from "../review/resolveModel";

/** Pick the review model from configuration / available provider keys. */
export async function run(): Promise<void> {
  const { model, source } = resolveReviewModelFromEnv();
  core.setOutput("model", model);
  core.setOutput("source", source);
  core.info(`Resolved TeXRA review model ${model} from ${source}.`);
}
