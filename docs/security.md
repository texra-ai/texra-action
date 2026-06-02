# Security

## Read-only by construction

The action runs the agent with `--api-mode personal --approval-policy never`.
In the non-interactive runner there is no approval handler, so every privileged
tool action (edit, write, shell with side effects) is denied. The agent can read
and reason over the pull request, but cannot modify the repository, push, or
open branches.

Keep `approval-policy: never`. Do not grant the agent write tools via `cli-args`.

## Untrusted input

The PR title, body, diff, commit messages, comments, and changed files are
attacker-controlled on pull requests from forks. Treat them as data, never as
instructions:

- The review prompt explicitly instructs the agent to ignore instructions found
  in PR content and to follow the prompt and repository instructions instead.
- PR title and body are passed to the prompt labelled `(untrusted)`.
- Other prompt-injection surfaces to keep in mind: files like `AGENTS.md`,
  embedded HTML comments, and images referenced in the diff.

## Who can trigger a run

On `pull_request` from a fork, GitHub does **not** expose repository secrets, so
a fork PR cannot spend your provider credits — the run no-ops without a key.

For triggers that _do_ expose secrets to untrusted actors — `pull_request_target`
or `@texra` mention handling via `issue_comment` — enable the authorization
gate:

```yaml
with:
  require-write-access: "true"
  allow-users: "" # or a comma-separated allow-list, or "*"
  allow-bots: "" # bots are denied unless listed, or "*"
```

With `require-write-access: true`, the action verifies the triggering actor has
`write` or `admin` permission (via the GitHub API) before doing any work, and
refuses bots unless they are allow-listed.

## Token scoping

- Request the least privilege: `contents: read` and, for review mode,
  `pull-requests: write`.
- Use `persist-credentials: false` on the PR checkout.
- Thread reply / resolve / unresolve mutations are gated behind
  `resolve-threads: true` and a token that can perform them.

## Supply chain

Third-party actions used internally (`actions/setup-node`, `oven-sh/setup-bun`)
are pinned by commit SHA. Pin `texra-version` to a known-good release so a new
CLI publish cannot change behavior unexpectedly, and pin
`texra-ai/texra-action@<sha>` if you require byte-for-byte reproducibility.
