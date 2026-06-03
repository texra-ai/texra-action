# Contributing

This action ships TypeScript that runs under [Bun](https://bun.sh) at action
runtime (no committed bundle). Dependencies are installed on the runner with
`bun install --production`.

## Local development

```bash
bun install
bun run typecheck   # tsc --noEmit
bun test            # bun's test runner
bun run format      # prettier --write
```

CI runs `format:check`, `typecheck`, and `test` on every pull request.

## Layout

```
action.yml            # generic "TeXRA Agent" action
review/action.yml     # nested "TeXRA Code Review" action
src/main.ts           # subcommand dispatch (bun run src/main.ts <subcommand>)
src/commands/         # one module per action step; reads env, writes outputs
src/lib/              # generic helpers (CLI result, JSON extraction, octokit)
src/review/           # review pipeline (pure transforms + octokit operations)
test/                 # bun tests for the pure transforms
prompts/              # bundled default review prompt
examples/             # copy-paste workflows
docs/                 # usage, configuration, review mode, security
```

The command wrappers in `src/commands/` are intentionally thin: they read
environment variables, call the pure functions in `src/lib` / `src/review`, and
write step outputs. Put testable logic in the libraries, not the wrappers.

## Releasing

Push a `vX.Y.Z` tag (or run the **Release** workflow with a version). CI must
pass; the workflow then creates a GitHub release and force-moves the major tag
(e.g. `v1`) so consumers pinning `@v1` get the new release.
