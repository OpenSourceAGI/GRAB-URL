# Contributing to GRAB-URL

Thanks for your interest in contributing! We welcome bug reports, documentation improvements, feature ideas, and pull requests.

GRAB-URL is an npm + Turborepo monorepo: the published `grab-url` request
manager is built from sources under `packages/` (the `grab-api` core, the
`grab-url-cli` downloader, and supporting packages), and the documentation
site lives in `apps/grab-help-docs` (published as [grab.js.org](https://grab.js.org)).

## Before You Start

- Read the [README](README.md), the architecture docs under [`.claude/architecture/`](.claude/architecture), and the docs under [`apps/grab-help-docs/content/docs`](apps/grab-help-docs/content/docs).
- Search [existing issues](https://github.com/OpenSourceAGI/GRAB-URL/issues) and [pull requests](https://github.com/OpenSourceAGI/GRAB-URL/pulls) to avoid duplicating work.
- For substantial changes — new public API, schema changes, or changes to how requests and downloaded content are modeled — open an issue first to discuss the problem, proposed approach, and scope.
- Be respectful and constructive in issues, reviews, and discussions.

## Reporting Bugs

Please open an issue using the [bug template](.github/ISSUE_TEMPLATE/bug.md) and include:

- A clear, descriptive title
- What you expected to happen
- What actually happened
- Steps to reproduce the problem
- Minimal reproducible code or repository, when possible
- Relevant logs, error messages, screenshots, and environment details

Environment details should include the commit, operating system, `npm --version`, `node --version`, and browser version when relevant.

## Suggesting Features

Feature requests are welcome — use the [feature request template](.github/ISSUE_TEMPLATE/feature_request.md) and explain:

- The problem or use case
- Your proposed solution
- Alternatives you considered
- Any compatibility, performance, security, or maintenance tradeoffs

Avoid starting a large implementation before maintainers have had a chance to comment on the proposal.

## Development Setup

The fastest way to get the project running is [`git0`](https://www.npmjs.com/package/git0) — it downloads the repo, detects the project type, installs dependencies with npm, and opens your editor in one step:

```bash
npx git0 OpenSourceAGI/GRAB-URL
```

`git0` downloads a source snapshot without `.git` history, which is ideal for trying the project out. To submit a pull request you need a real git clone of your own fork:

1. Fork the repository and clone your fork.
2. Create a branch from `master`.
3. Install dependencies with npm.
4. Run the project locally and confirm the existing tests pass.

```bash
git clone https://github.com/YOUR-USERNAME/GRAB-URL.git
cd GRAB-URL
git checkout -b feat/short-description

npm install          # installs every workspace package
npm run test         # runs the Vitest suite
```

Requires [Node.js](https://nodejs.org) 20 or newer and [npm](https://www.npmjs.com) 11 (the `packageManager` field pins the exact version).

Useful targets:

```bash
npm run build        # turbo build: compiles grab-url dist + docs site
npm run test         # turbo test: Vitest across the workspace
npm run test:coverage # Vitest with coverage (reported to Codecov in CI)
```

For the `grab-url` package directly:

```bash
cd packages/grab-url
npm run build       # vite build -> dist/
npm run test         # vitest
npm run test:cli    # run the CLI against a URL
```

For the documentation site:

```bash
cd apps/grab-help-docs
npm run dev         # next dev --turbo
npm run check       # fumadocs-mdx + tsc --noEmit
```

## Making Changes

- Keep changes focused; avoid unrelated refactors in the same pull request.
- Match the existing code style, naming conventions, and project architecture.
- Keep package boundaries clean — import from a package's public entry point rather than reaching into its internals.
- `grab-url`'s product claim is zero runtime dependencies for the `grab()` function. An import added to `packages/grab-api/src/` that is not a Node builtin breaks it — check before reaching for a helper library.
- Anything added to `index.ts` that the slim entry also imports must stay externalizable, or `grab-url/slim` quietly stops being slim. Check `slimExternalPkgs` in `packages/grab-url/vite.config.ts`.
- Add or update tests for behavior changes and bug fixes.
- Update documentation, examples, and types when applicable.
- Do not commit secrets, credentials, API keys, private keys, generated build output, or unrelated `package-lock.json` changes.
- Write clear commit messages that describe the change.

## Testing

Before opening a pull request, run the relevant checks locally — these are the same commands CI runs:

```bash
npm run build
npm run test
npm run test:coverage
```

If you touch the docs site, also run `npm run check` from `apps/grab-help-docs`.

If you cannot run a check, state that clearly in the pull request and explain why.

## Pull Requests

When opening a pull request:

- Target the `master` branch.
- Use a concise title that describes the user-visible change.
- Explain what changed and why.
- Link related issues using `Fixes #123` or `Closes #123` when appropriate.
- Include test results and any manual verification steps.
- Include screenshots or recordings for user-interface changes.
- Keep the pull request small enough to review effectively.
- Respond to review feedback constructively and update the branch as requested.

### Pull Request Template

```md
## Summary

- What does this change do?

## Motivation

- What problem does it solve?

## Testing

- [ ] Tests added or updated
- [ ] `npm run build` passes
- [ ] `npm run test` passes
- [ ] `npm run test:coverage` passes
- [ ] Manual testing completed

## Screenshots / Notes

- Add screenshots, migration notes, or rollout considerations if relevant.
```

## Documentation

Documentation changes are valuable contributions. Please keep examples accurate, use clear language, and update the pages under [`apps/grab-help-docs/content/docs`](apps/grab-help-docs/content/docs) when behavior or configuration changes.

## License

By contributing, you agree that your contributions will be licensed under the same license as this repository (PROSPER 1.0.0, see [LICENSE.md](LICENSE.md)).

## Questions

If you are unsure where to start, open a discussion or issue describing what you would like to work on. Maintainers can help identify an appropriate next step.