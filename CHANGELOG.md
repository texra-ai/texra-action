# Changelog

## Unreleased

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
