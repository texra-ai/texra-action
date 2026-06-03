# How the review works

The code-review action runs a **tool-use agent** that investigates a pull
request and emits a single structured review at the end; the action then
**validates and posts** that review. The agent never holds a GitHub token and
never calls the GitHub API — separating "decide what to say" (agent) from
"place it on the PR" (action) keeps comment placement, de-duplication, and
fallbacks in one auditable place.

## Pipeline

Each step is a subcommand of the action's multitool (`src/main.ts`), wired
together in `review/action.yml`:

| Step                     | What it does                                                                                                                                                                                      |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **resolve-model**        | Pick the model: an explicit `model` if set, otherwise the default for the first configured provider key (`src/review/resolveModel.ts`, `src/lib/providers.ts`).                                   |
| **prepare-diff**         | `git diff merge-base(base, head)..head` into a diff file, then parse it into **commentable-line anchors** — the exact added (`RIGHT`) and removed (`LEFT`) lines an inline comment may attach to. |
| **collect-threads**      | GraphQL-fetch the PR's existing review threads that carry the review marker, so the agent can reply to or resolve its own earlier comments.                                                       |
| **write-prompt-context** | Render PR metadata (read natively from the `@actions/github` event context) plus labelled file references into a context file.                                                                    |
| **resolve-prompt**       | Concatenate the prompt (a supplied `prompt-file`, else the bundled neutral default) with the context into one instruction file.                                                                   |
| **run-agent**            | Run the TeXRA CLI (below).                                                                                                                                                                        |
| **normalize-review**     | Parse the agent's output into the canonical review payload.                                                                                                                                       |
| **post-review**          | Place the review on the PR.                                                                                                                                                                       |

## The agent run

`run-agent` shells out to the CLI:

```
texra agents run <agent> --instruction-file <prompt> --cwd <workspace> \
  --api-mode <api-mode> --approval-policy <approval-policy> \
  --output-format json --print \
  --context <pr.diff> --context <commentable-lines.md> --context <threads.json>
```

- The agent is a **tool-use agent**. It reads the diff, the commentable
  anchors, and any prior threads, then inspects the actual repository files to
  ground its findings.
- `--approval-policy` sets the capability ceiling — see
  [`approval policy`](#approval-policy-and-capabilities).
- `--api-mode personal` runs against the provider keys you pass in, not a
  hosted relay. Keys are injected into the CLI subprocess environment as
  `<PROVIDER>_API_KEY` (`src/lib/providers.ts`); they are never written to disk
  or passed on the command line.

The agent's job is to return **one JSON object** as its final message:

```json
{
  "body": "## TeXRA Code Review …",
  "comments": [{ "path": "…", "line": 42, "side": "RIGHT", "body": "…" }],
  "thread_actions": [{ "action": "resolve", "thread_id": "…", "body": "…" }]
}
```

## Capturing the output

The CLI runs with `--output-format json --print`, which writes a **single JSON
object** to stdout (progress and logs go to stderr and are forwarded to the run
log). `normalize-review`:

1. `JSON.parse`s the whole stdout and reads the agent's final message
   (`result.lastResponse`).
2. Extracts the embedded review JSON with a tolerant ladder
   (`parseModelJson`: whole string → fenced ` ```json ` block → outermost
   `{ … }`), so a model that wraps its JSON in prose still parses.
3. Validates and normalizes it through a Zod schema (`src/review/schema.ts`):
   malformed comments are dropped, thread actions de-duplicated, and the list
   capped.

This "emit structured JSON at the end, parse it centrally" approach is chosen
over having the agent call GitHub directly: it is atomic, easy to validate, and
keeps the agent free of any write credential.

## Posting

`post-review` (`src/review/postReviewLib.ts`) places exactly one review:

- A single `createReview` (event `COMMENT`) carries the body and the inline
  comments. Each comment is **re-checked against the commentable anchors**; a
  comment that does not land on a changed line is folded into the body rather
  than dropped or rejected by the API.
- Every comment and reply is prefixed with the **review marker** so the next
  run can find its own threads.
- **Thread actions** (reply / resolve / unresolve) are applied over GraphQL,
  gated by `resolve-threads` and a token permitted to mutate threads.

Because the marker identifies prior TeXRA threads, the action is
**idempotent**: each push refreshes one review in place instead of stacking new
ones.

## Approval policy and capabilities

The `approval-policy` input controls what the agent may do. It defaults to
**`yolo`**:

- **`yolo`** (default) — every tool action is auto-approved, which enables the
  **bash tool** and unrestricted tool calls. The agent can run arbitrary shell
  commands in the runner to investigate the code as deeply as it needs.
- **`never`** — read-only. Read / search / glob tools are available; the bash
  tool and any write/edit tool are denied. The agent cannot run shell commands
  or modify files.

Treat `yolo` as running untrusted-PR-influenced code with full shell access in
the runner; see [`security.md`](./security.md) for the trust model and the
mitigations (fork PRs no-op for lack of a provider secret, the prompt is sourced
from the trusted base branch, and the agent holds no GitHub token).
