# Review mode

`texra-ai/texra-action/review@v1` turns a TeXRA agent into a pull-request
reviewer. It runs these steps:

1. **Resolve model** — pick the review model from `model` / configured keys.
2. **Prepare diff** — compute `merge-base(base, head)..head` and parse it into
   the set of commentable line anchors (RIGHT = head lines, LEFT = removed base
   lines).
3. **Collect threads** — read the PR's existing review threads that carry the
   TeXRA marker, so the agent can resolve or reply to them.
4. **Assemble prompt** — your prompt plus a runtime-context block naming the
   diff, the anchors file, and the previous-threads file.
5. **Run** — `texra agents run <agent> --output-format json --print` with full
   tool access by default (`approval-policy: yolo`; set `never` for read-only).
6. **Normalize** — extract the JSON the agent emits into the canonical payload.
7. **Post** — create a single `COMMENT` review with inline comments and a body.

## The review payload contract

The agent must emit a single JSON object:

```json
{
  "body": "## TeXRA Code Review\n\n...",
  "comments": [
    { "path": "src/x.ts", "line": 42, "side": "RIGHT", "body": "..." }
  ],
  "thread_actions": [
    { "action": "reply", "thread_id": "...", "body": "..." },
    { "action": "resolve", "thread_id": "...", "body": "optional" },
    { "action": "unresolve", "thread_id": "...", "body": "optional" }
  ]
}
```

- `body` must start with `## TeXRA Code Review`.
- Inline `comments` are validated against the commentable anchors; comments that
  do not land on a changed line are moved into the review body instead of being
  dropped.
- `comments` and `thread_actions` are each capped at 50.
- The action tolerates chatty output: a JSON object inside prose or a ```json
  fence is still extracted.

## Inline comment placement

Use `side: "RIGHT"` for new/modified head lines and `side: "LEFT"` for removed
base lines. For multi-line comments add `start_line` and `start_side`. If a
finding cannot be confidently placed on a changed line, put it in `body`.

## Marker and idempotency

Every posted comment and reply is prefixed with the `review-marker`
(default `<!-- texra-review -->`). This is how the action finds its own prior
threads on subsequent runs.

## Thread actions and tokens

Reply / resolve / unresolve mutations only run when `resolve-threads: true`
**and** the `github-token` is allowed to mutate threads. The default
`${{ github.token }}` can create reviews but may not be able to resolve threads
authored by another identity; pass a dedicated bot token (e.g.
`TEXRA_REVIEW_GITHUB_TOKEN`) to enable them. When a token is missing, thread
actions are skipped with a notice rather than failing the run.

## Failure behavior

If the agent run itself exits non-zero (for example a CLI or provider error),
the job fails and **no** review is posted — the failure is visible as a failed
check rather than a misleading "review" comment. An empty or status-only final
message is still posted, with a default body.

## Custom prompt

Override the bundled neutral prompt with your own:

```yaml
- uses: texra-ai/texra-action/review@v1
  with:
    prompt-file: .github/prompts/my-review-prompt.md
```

Keep your prompt's output contract identical to the schema above.
