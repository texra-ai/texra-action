import { z } from "zod";
import { providerKeysFromInputs } from "./providers";

/**
 * Single source of truth for the action's inputs. The composite action passes
 * every input as one JSON blob (`INPUTS: ${{ toJson(inputs) }}`); this schema
 * parses it with declarative defaults and exposes a clean, typed config — no
 * per-input environment-variable passthroughs to hand-maintain. Add an input by
 * adding one line here.
 */
const str = (def = "") => z.string().default(def);

const RawInputsSchema = z
  .object({
    prompt: str(),
    "prompt-file": str(),
    "prompt-context": str(),
    "prompt-context-file": str(),
    agent: str("review"),
    model: str(),
    "model-defaults": str(),
    "context-files": str(),
    "texra-version": str(),
    "api-mode": str("personal"),
    "approval-policy": str("never"),
    "working-directory": str(),
    "output-format": str("json"),
    "output-file": str(),
    "cli-args": str(),
    "review-marker": str("<!-- texra-review -->"),
    "resolve-threads": str("false"),
    "github-token": str(),
    "require-write-access": str("false"),
    "allow-users": str(),
    "allow-bots": str(),
  })
  // Provider keys (and any future inputs) flow through as strings.
  .catchall(z.string());

export const ActionInputsSchema = RawInputsSchema.transform((raw) => ({
  prompt: raw.prompt,
  promptFile: raw["prompt-file"],
  promptContext: raw["prompt-context"],
  promptContextFile: raw["prompt-context-file"],
  agent: raw.agent,
  model: raw.model,
  modelDefaults: raw["model-defaults"],
  contextFiles: raw["context-files"],
  texraVersion: raw["texra-version"],
  apiMode: raw["api-mode"],
  approvalPolicy: raw["approval-policy"],
  workingDirectory: raw["working-directory"],
  outputFormat: raw["output-format"],
  outputFile: raw["output-file"],
  cliArgs: raw["cli-args"],
  reviewMarker: raw["review-marker"],
  resolveThreads: raw["resolve-threads"] === "true",
  githubToken: raw["github-token"],
  requireWriteAccess: raw["require-write-access"] === "true",
  allowUsers: raw["allow-users"],
  allowBots: raw["allow-bots"],
  providerKeys: providerKeysFromInputs(raw as Record<string, string>),
}));

export type ActionInputs = z.infer<typeof ActionInputsSchema>;

/** Parse the `INPUTS` JSON blob into the typed config (defaults on any failure). */
export function readInputs(): ActionInputs {
  let raw: unknown = {};
  try {
    raw = JSON.parse(process.env.INPUTS ?? "{}");
  } catch {
    raw = {};
  }
  const parsed = ActionInputsSchema.safeParse(raw);
  return parsed.success ? parsed.data : ActionInputsSchema.parse({});
}
