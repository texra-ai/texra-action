# Configuration

## Provider API keys

The action exposes one input per provider TeXRA supports. Each is forwarded to
the CLI as the environment variable the CLI reads (`<PROVIDER>_API_KEY`):

| Input                | Environment variable | Provider id  |
| -------------------- | -------------------- | ------------ |
| `anthropic-api-key`  | `ANTHROPIC_API_KEY`  | `anthropic`  |
| `openai-api-key`     | `OPENAI_API_KEY`     | `openai`     |
| `deepseek-api-key`   | `DEEPSEEK_API_KEY`   | `deepseek`   |
| `google-api-key`     | `GOOGLE_API_KEY`     | `google`     |
| `openrouter-api-key` | `OPENROUTER_API_KEY` | `openRouter` |
| `xai-api-key`        | `XAI_API_KEY`        | `xai`        |
| `moonshot-api-key`   | `MOONSHOT_API_KEY`   | `moonshot`   |
| `dashscope-api-key`  | `DASHSCOPE_API_KEY`  | `dashscope`  |
| `minimax-api-key`    | `MINIMAX_API_KEY`    | `minimax`    |
| `glm-api-key`        | `GLM_API_KEY`        | `glm`        |

Provide only the keys you use. Keys are injected only into the step that runs the
CLI (and, for review mode, the model-resolution step).

## API mode

`api-mode` defaults to `personal`, which makes the CLI use the provider keys
above rather than a TeXRA login. Keep `personal` in CI.

## Approval policy

`approval-policy` defaults to `yolo`: the agent has the bash tool and unrestricted
tool calls and runs shell commands in the runner. Set it to `never` for a
read-only run (read/search tools only; bash and write/edit denied). See
[security](./security.md) for which to choose on a given trigger.

## Model selection (review mode)

When `model` is empty, the review action picks a default model from the first
configured provider in this precedence order:

`deepseek → anthropic → openai → google → openRouter → xai → moonshot →
dashscope → minimax → glm`

Each provider has a built-in default short-id (e.g. `deepseekproT`, `opus48T`,
`gpt55`, `gemini31p`, `kimi26T`, `qwenplus`, `minimaxM27`, `glm51`). Override
them:

- Per provider, via `model-defaults`, a JSON map. For example,
  `model-defaults: '{"anthropic":"opus48T","openai":"gpt55"}'`.
- Globally, by setting `model` to a specific short-id.

## Configuration precedence

Following the CLI guidelines, configuration resolves as:
**action inputs → environment → repository config → defaults**. Action inputs
always win, so a workflow can override anything the repository configures.
