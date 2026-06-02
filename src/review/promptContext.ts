/**
 * Render the runtime context block appended to the review prompt.
 *
 * PR title and body are labelled "(untrusted)" so the agent knows to treat them
 * as data, not instructions. Values are read from environment variables the
 * review action sets from the workflow's GitHub event payload.
 */
export const PROMPT_CONTEXT_FIELDS: Array<[label: string, envVar: string]> = [
  ["PR number", "PR_NUMBER"],
  ["Repository", "REPOSITORY"],
  ["Repository owner", "REPOSITORY_OWNER"],
  ["Repository name", "REPOSITORY_NAME"],
  ["Pull request title JSON (untrusted)", "PR_TITLE_JSON"],
  ["Pull request body JSON (untrusted)", "PR_BODY_JSON"],
  ["Base ref", "BASE_REF"],
  ["Base SHA", "BASE_SHA"],
  ["Head ref", "HEAD_REF"],
  ["Head SHA", "HEAD_SHA"],
  ["Trigger event", "TRIGGER_EVENT"],
  ["Review mode", "REVIEW_MODE"],
  ["TeXRA review model", "TEXRA_REVIEW_MODEL"],
];

export function promptContextText(
  env: NodeJS.ProcessEnv = process.env,
): string {
  const lines = PROMPT_CONTEXT_FIELDS.map(
    ([label, name]) => `${label}: ${env[name] ?? ""}`,
  );
  return `${lines.join("\n")}\n`;
}

/**
 * Labelled references to the context files the review run attaches, so the
 * review prompt can name the diff, commentable-line anchors, and previous
 * threads explicitly. Only non-empty paths are listed.
 */
export const PROMPT_CONTEXT_FILE_FIELDS: Array<
  [label: string, envVar: string]
> = [
  ["Review context file", "REVIEW_CONTEXT_FILE"],
  ["Commentable line anchors file", "COMMENTABLE_LINES_FILE"],
  ["Previous TeXRA review threads file", "REVIEW_THREAD_CONTEXT_FILE"],
];

export function fileReferencesText(
  env: NodeJS.ProcessEnv = process.env,
): string {
  const lines = PROMPT_CONTEXT_FILE_FIELDS.filter(([, name]) =>
    (env[name] ?? "").trim(),
  ).map(([label, name]) => `${label}: \`${env[name]}\``);
  return lines.length ? `${lines.join("\n")}\n` : "";
}
