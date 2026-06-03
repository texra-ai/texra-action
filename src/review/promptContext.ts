/**
 * Render the runtime-context block appended to the review prompt. Values are
 * supplied as a structured object (sourced from `@actions/github` context by the
 * command layer) rather than read from ad-hoc environment variables. PR title
 * and body are labelled "(untrusted)" so the agent treats them as data.
 */
export interface PromptContextFields {
  prNumber: string;
  repository: string;
  repositoryOwner: string;
  repositoryName: string;
  prTitleJson: string;
  prBodyJson: string;
  baseRef: string;
  baseSha: string;
  headRef: string;
  headSha: string;
  triggerEvent: string;
  reviewMode: string;
  reviewModel: string;
}

const FIELD_LABELS: Array<[key: keyof PromptContextFields, label: string]> = [
  ["prNumber", "PR number"],
  ["repository", "Repository"],
  ["repositoryOwner", "Repository owner"],
  ["repositoryName", "Repository name"],
  ["prTitleJson", "Pull request title JSON (untrusted)"],
  ["prBodyJson", "Pull request body JSON (untrusted)"],
  ["baseRef", "Base ref"],
  ["baseSha", "Base SHA"],
  ["headRef", "Head ref"],
  ["headSha", "Head SHA"],
  ["triggerEvent", "Trigger event"],
  ["reviewMode", "Review mode"],
  ["reviewModel", "TeXRA review model"],
];

export function promptContextText(fields: PromptContextFields): string {
  return `${FIELD_LABELS.map(([key, label]) => `${label}: ${fields[key]}`).join("\n")}\n`;
}

/**
 * Labelled references to the context files the review run attaches, so the
 * review prompt can name the diff, commentable-line anchors, and previous
 * threads explicitly. Only non-empty paths are listed.
 */
export interface ContextFileRefs {
  reviewContextFile?: string;
  commentableLinesFile?: string;
  reviewThreadContextFile?: string;
}

const FILE_REF_LABELS: Array<[key: keyof ContextFileRefs, label: string]> = [
  ["reviewContextFile", "Review context file"],
  ["commentableLinesFile", "Commentable line anchors file"],
  ["reviewThreadContextFile", "Previous TeXRA review threads file"],
];

export function fileReferencesText(refs: ContextFileRefs): string {
  const lines = FILE_REF_LABELS.filter(([key]) => (refs[key] ?? "").trim()).map(
    ([key, label]) => `${label}: \`${refs[key]}\``,
  );
  return lines.length ? `${lines.join("\n")}\n` : "";
}
