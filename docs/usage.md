# Usage

The repository ships two actions:

- **`texra-ai/texra-action@v1`**: a generic runner for any TeXRA tool-use agent.
- **`texra-ai/texra-action/review@v1`**: review mode, which wraps the runner
  with diff preparation and pull-request posting.

Both install `@texra-ai/cli` and run `texra agents run`. They differ only in the
surrounding steps.

## Providing the prompt

Provide exactly one of:

- `prompt`: an inline instruction string.
- `prompt-file`: a path to an instruction file in the checked-out repository.

Additional context can be appended with `prompt-context` (inline) or
`prompt-context-file` (a path). Read-only files the agent should consult are
passed with `context-files` (newline-separated), each forwarded as `--context`.

## Selecting the agent and model

- `agent` (default `review`) chooses the TeXRA tool-use agent.
- `model` maps to `--model`. When empty, the agent's default model or
  `TEXRA_MODEL` is used. In review mode, an empty `model` is resolved from the
  configured provider keys (see [review mode](./review-mode.md)).

## CLI version (`texra-version`)

| Value       | Behavior                                                    |
| ----------- | ----------------------------------------------------------- |
| `` (empty)  | Installs the latest published `@texra-ai/cli`.              |
| `latest`    | Same as empty.                                              |
| `1.2.3`     | Installs that exact published version (recommended to pin). |
| `workspace` | Builds the CLI from the checked-out monorepo (dogfooding).  |

Because the action installs the CLI from npm, pinning `texra-version` to a
known-good release keeps your workflow reproducible. `workspace` only works when
the checked-out repository is the TeXRA monorepo.

## Passing extra CLI flags

`cli-args` is appended verbatim to the `texra agents run` invocation. A value
starting with `[` is parsed as a JSON array; otherwise it is split shell-style
with basic quote support.

```yaml
cli-args: '["--max-turns","20"]'
# or
cli-args: --max-turns 20
```

## Outputs (core action)

| Output              | Description                                               |
| ------------------- | --------------------------------------------------------- |
| `final-message`     | The agent's final message.                                |
| `output-file`       | Path to a file containing the final message.              |
| `result-json`       | Path to the raw `texra ... --output-format json` payload. |
| `structured-output` | JSON object extracted from the final message, if present. |

```yaml
- id: texra
  uses: texra-ai/texra-action@v1
  with:
    prompt: "..."
    anthropic-api-key: ${{ secrets.ANTHROPIC_API_KEY }}
- run: |
    echo "${{ steps.texra.outputs.final-message }}"
    echo "${{ steps.texra.outputs.structured-output }}"
```

## Requirements

- An interactive checkout is **not** used; the action never runs the TeXRA TUI.
- Review mode requires `fetch-depth: 0` so the merge base is reachable.
- Node 22 and Bun are installed by the action; no setup is needed in your job.
