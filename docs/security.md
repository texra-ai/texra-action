# Security

## Capability model

By default the action runs the agent with `--api-mode personal --approval-policy
yolo`. Under `yolo` every tool action is auto-approved: the agent has the bash
tool and unrestricted tool calls, and runs shell commands in the runner with the
same privileges as any other step in the job. The agent never holds a GitHub
token; it emits a JSON review that the action posts. Within the runner, though,
it is unrestricted.

Because `yolo` executes untrusted-PR-influenced code, the fork no-op below
matters: on `pull_request` from a fork GitHub exposes no repository secret, so
the run no-ops before the agent starts (no provider key, no model call).
Unrestricted runs therefore only happen when a provider key is available, on
same-repo PRs or contexts you opt into. If you wire this action onto a trigger
that exposes secrets to untrusted actors, either enable the authorization gate
(below) or run read-only:

```yaml
with:
  approval-policy: never # read/search tools only; bash and write/edit denied
```

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
a fork PR cannot spend your provider credits; the run no-ops without a key.

For triggers that _do_ expose secrets to untrusted actors (`pull_request_target`,
or `@texra` mention handling via `issue_comment`), enable the authorization gate:

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

- Install the [TeXRA GitHub App](https://github.com/apps/texra-ai-bot) and grant
  the job `id-token: write`. By default the action exchanges GitHub Actions
  OIDC for a one-hour installation token restricted to the calling repository.
- The exchange accepts only a signed GitHub OIDC token whose exact workflow
  blob matches the same workflow path on the repository's default branch. A
  workflow introduced or modified only on a pull-request branch cannot mint an
  App token; such a run logs a notice and finishes without doing any work, so
  pull requests that edit their own workflow do not fail. Merge the workflow
  change, or set `github-token`, to run on that branch.
- The App token is passed only to authorization and GitHub API steps. It is not
  placed in the environment of the TeXRA CLI or agent process.
- `github-token` remains an explicit override for custom Apps and other
  controlled credentials.
- Request the least privilege: `contents: read` and, for review mode,
  `pull-requests: write`, plus `id-token: write` for App authentication.
- Use `persist-credentials: false` on the PR checkout.
- Thread reply / resolve / unresolve mutations are gated behind
  `resolve-threads: true` and a token that can perform them.

## Supply chain

Third-party actions used internally (`actions/setup-node`, `oven-sh/setup-bun`)
are pinned by commit SHA. Pin `texra-version` to a known-good release so a new
CLI publish cannot change behavior unexpectedly, and pin
`texra-ai/texra-action@<sha>` if you require byte-for-byte reproducibility.
