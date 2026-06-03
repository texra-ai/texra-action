# Changelog

## v1.1.0

### Changed

- **Default `approval-policy` is now `yolo`.** The review agent runs with the
  bash tool and unrestricted tool calls by default, executing shell commands in
  the runner to investigate changes. The bundled review prompt no longer forbids
  shell use. Set `approval-policy: never` to restore the previous read-only
  behavior. On fork PRs the run still no-ops for lack of a provider secret; read
  [docs/security.md](./docs/security.md) before adopting on secret-exposing
  triggers.

### Added

- `approval-policy` input exposed on the **review action** (it was already
  present on the core action), so review workflows can choose `yolo` (default)
  or `never`.

## v1.0.0

### Features

- Initial release of `texra-ai/texra-action`.
- **Core action** (`texra-ai/texra-action`): run any TeXRA tool-use agent in CI
  with `texra agents run --output-format json --print`, exposing `final-message`,
  `output-file`, `result-json`, and `structured-output`.
- **Review action** (`texra-ai/texra-action/review`): compute the PR diff and
  commentable-line anchors, collect previous TeXRA review threads, run the agent
  read-only, and post a `COMMENT` review with validated inline comments.
- All ten TeXRA providers exposed as `*-api-key` inputs (anthropic, openai,
  deepseek, google, openrouter, xai, moonshot, dashscope, minimax, glm).
- Optional `require-write-access` authorization gate for mention /
  `pull_request_target` triggers.
- Bundled neutral review prompt, with `prompt-file` to supply your own.
