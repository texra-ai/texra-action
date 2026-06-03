# TeXRA Action

Run a [TeXRA](https://texra.ai) tool-use agent in GitHub Actions. Use it to
review pull requests inline, or to run any TeXRA agent headlessly in CI and
consume its output.

The action installs the [`@texra-ai/cli`](https://www.npmjs.com/package/@texra-ai/cli),
runs `texra agents run` against your repository, and (in review mode) posts a
pull-request review with inline comments and a summary.

## Quickstart: pull request review

```yaml
# .github/workflows/texra-code-review.yml
name: TeXRA Code Review

on:
  pull_request:
    types: [opened, synchronize, ready_for_review, reopened]

concurrency:
  group: texra-review-${{ github.event.pull_request.number }}
  cancel-in-progress: true

jobs:
  review:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write
    steps:
      - uses: actions/checkout@v6
        with:
          ref: refs/pull/${{ github.event.pull_request.number }}/merge
          fetch-depth: 0
          persist-credentials: false
      - uses: texra-ai/texra-action/review@v1
        with:
          anthropic-api-key: ${{ secrets.ANTHROPIC_API_KEY }}
```

`fetch-depth: 0` is required so the action can compute the `merge-base..head`
diff. Provide at least one provider key; the review model is auto-selected from
whichever keys are present (override with `model`).

## Run any agent

```yaml
- id: texra
  uses: texra-ai/texra-action@v1
  with:
    agent: review
    prompt: "Summarize the riskiest changes in this repository."
    anthropic-api-key: ${{ secrets.ANTHROPIC_API_KEY }}
- run: echo "${{ steps.texra.outputs.final-message }}"
```

See [`examples/`](./examples) for path-filtered review, custom prompts,
`@texra` mention handling, manual dispatch, and structured-output consumption.

## Two actions

| Action                            | Purpose                                                     |
| --------------------------------- | ----------------------------------------------------------- |
| `texra-ai/texra-action@v1`        | Generic runner. Run a tool-use agent, expose its message.   |
| `texra-ai/texra-action/review@v1` | Review mode. Diff, run, and post a PR review with comments. |

## Core action inputs (selected)

| Input                  | Default                   | Description                                                                                             |
| ---------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------- |
| `prompt`               |                           | Inline instruction (or use `prompt-file`).                                                              |
| `prompt-file`          |                           | Path to an instruction file.                                                                            |
| `agent`                | `review`                  | Tool-use agent to run.                                                                                  |
| `model`                |                           | Model id (`--model`). Empty uses the agent default.                                                     |
| `context-files`        |                           | Newline-separated read-only files passed as `--context`.                                                |
| `texra-version`        | `` (latest)               | CLI version; `workspace` builds a local checkout.                                                       |
| `api-mode`             | `personal`                | Use `personal` so provider keys are used (not a TeXRA login).                                           |
| `approval-policy`      | `yolo`                    | `yolo` enables bash + unrestricted tool calls; `never` is read-only.                                    |
| `working-directory`    | `${{ github.workspace }}` | Directory the agent runs against (`--cwd`).                                                             |
| `cli-args`             |                           | Extra CLI args (JSON array or shell string).                                                            |
| `require-write-access` | `false`                   | Require the actor to have write access before running.                                                  |
| `*-api-key`            |                           | Provider keys: anthropic, openai, deepseek, google, openrouter, xai, moonshot, dashscope, minimax, glm. |

Outputs: `final-message`, `output-file`, `result-json`, `structured-output`.

## Review action inputs (selected)

| Input             | Default                 | Description                                           |
| ----------------- | ----------------------- | ----------------------------------------------------- |
| `prompt-file`     | bundled neutral prompt  | Your own review prompt (kept in your repo).           |
| `model`           |                         | Pin the review model; empty auto-selects.             |
| `model-defaults`  |                         | JSON map of provider → default model short-id.        |
| `review-marker`   | `<!-- texra-review -->` | Marker used to find TeXRA review threads.             |
| `resolve-threads` | `false`                 | Reply/resolve threads (needs a thread-capable token). |
| `github-token`    | `${{ github.token }}`   | Token for reading threads and posting the review.     |

Outputs: `review-json`, `final-message`, `model`, `output-file`.

Full reference: [docs/usage.md](./docs/usage.md) ·
[configuration](./docs/configuration.md) · [review mode](./docs/review-mode.md) ·
[how it works](./docs/how-it-works.md) · [security](./docs/security.md).

## How it works

1. Installs Bun and Node, then installs the action's dependencies.
2. Installs `@texra-ai/cli` from npm (or builds a `workspace` checkout).
3. (review) Computes the PR diff and the commentable-line anchors, collects
   previous TeXRA review threads, and assembles the prompt.
4. Runs `texra agents run <agent> --output-format json --print`
   (`--api-mode personal --approval-policy yolo`, so the agent has the bash tool
   and full tool access; set `approval-policy: never` for a read-only run).
5. (review) Normalizes the agent's JSON and posts a single `COMMENT` review
   with inline comments that land on commentable lines.

## Security

By default the agent runs with `--approval-policy yolo`: it has the bash tool and
unrestricted tool calls, executing in the runner with the job's privileges (set
`approval-policy: never` for a read-only run). PR title, body, diff, and comments
are treated as untrusted input; on fork PRs no provider secret is exposed, so the
run no-ops before the agent starts. For mention/`pull_request_target` triggers,
set `require-write-access: true`. See [docs/security.md](./docs/security.md).

## License

[MIT](./LICENSE)
