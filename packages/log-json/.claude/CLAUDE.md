# CLAUDE.md — `@grab-url/log`

**Private — never published.** Built into `dist/log.*` and exposed as
`grab-url/log`.

A JSON logger with structured output and terminal colors.

## Rules

- **It is used by the CLI and the library both.** Colors must degrade: no ANSI
  when the output is not a TTY, when `NO_COLOR` is set, or when the consumer is
  capturing JSON. A logger that emits escape codes into a piped JSON stream
  breaks every caller that parses it.
- **Never log credentials, tokens, or full URLs with query strings** — the
  client this ships with sends authenticated requests, and a logged URL is a
  logged API key.
- Structured output is the contract (`structure.ts`). Adding or renaming a field
  changes what consumers parse.

## Layout

`src/log-json.ts` (entry) · `src/structure.ts` · `src/colors.ts`

Tests: `test/log.test.ts` in the root test folder.
