<!-- template-git-repo:badges:start -->
<p align="center">
    <a href="https://grab.js.org"><img src="https://img.shields.io/badge/Docs-blue?logo=ReadTheDocs&logoColor=white" alt="Documentation" /></a>
    <a href="https://stackblitz.com/github/OpenSourceAGI/GRAB-URL/tree/master/packages/log-json"><img height="20px" src="https://developer.stackblitz.com/img/open_in_stackblitz.svg" alt="Open in StackBlitz" /></a>
    <br />
    <a href="https://github.com/OpenSourceAGI/GRAB-URL/stargazers"><img src="https://img.shields.io/github/stars/OpenSourceAGI/GRAB-URL" alt="GitHub Stars" /></a>
    <a href="https://github.com/OpenSourceAGI/GRAB-URL/issues"><img src="https://img.shields.io/github/issues/OpenSourceAGI/GRAB-URL?logo=github" alt="GitHub Issues" /></a>
    <a href="https://github.com/OpenSourceAGI/GRAB-URL/pulls"><img src="https://img.shields.io/github/issues-pr/OpenSourceAGI/GRAB-URL?logo=github&label=PRs" alt="Open Pull Requests" /></a>
    <a href="https://github.com/OpenSourceAGI/GRAB-URL/pulls?q=is%3Apr+is%3Aclosed"><img src="https://img.shields.io/github/issues-pr-closed/OpenSourceAGI/GRAB-URL?logo=github&label=PRs%20merged&color=8957e5" alt="Merged Pull Requests" /></a>
    <a href="https://github.com/OpenSourceAGI/GRAB-URL/discussions"><img src="https://img.shields.io/github/discussions/OpenSourceAGI/GRAB-URL" alt="GitHub Discussions" /></a>
    <a href="https://github.com/OpenSourceAGI/GRAB-URL/commits/master/"><img src="https://img.shields.io/github/last-commit/OpenSourceAGI/GRAB-URL.svg" alt="GitHub last commit" /></a>
    <br />
    <img src="https://img.shields.io/badge/npm-CB3837?logo=npm&logoColor=white" alt="npm" />
</p>
<!-- template-git-repo:badges:end -->

# @grab-url/log

Tiny colorized logger that works in **both the browser and Node.js**. Logs strings or objects, and for objects also renders a compact, color-coded view of the JSON's structure (types, not values) alongside the pretty-printed JSON itself.

Used internally by [`grab-url`](https://grab.js.org) — exposed as the global `log()` in the browser and on `globalThis` in Node.

## Usage

```ts
import { log } from "@grab-url/log";

log("hello world");                          // simple colored line
log("error", { color: "red" });              // named color
log({ user: { id: 1, name: "Ada" } });        // structure + JSON
log("with %c style", { color: ["cyan"] });    // multi-color via %c placeholders
```

### Spinner

```ts
log("loading...", { startSpinner: true, color: "yellow" });
// ...do work...
log("done", { stopSpinner: true });
```

### Hide in production

By default, logs are routed to `console.debug` (and effectively hidden) when running on a non-localhost host. Override explicitly:

```ts
log("verbose", { hideInProduction: false });
```

## API

```ts
type LogOptions = {
  color?: ColorName | ColorName[]; // single color or array (with %c placeholders)
  style?: string;                   // CSS-style string for browser console
  hideInProduction?: boolean;       // auto-detected from window.location.hostname
  startSpinner?: boolean;           // begin a terminal spinner alongside the message
  stopSpinner?: boolean;            // stop the active spinner and finalize the line
};

log(message: string | object, options?: LogOptions): true;
```

Other exports:

```ts
import { ColorName, getColors, printJSONStructure } from "@grab-url/log";
```

- **`ColorName`** — enum of supported color names: `red`, `green`, `yellow`, `blue`, `magenta`, `cyan`, `white`, `gray`, `brightRed`…`brightWhite`, plus background variants (`bgRed`, `bgGreen`, …).
- **`getColors()`** — returns the ANSI code map for the current environment.
- **`printJSONStructure(value)`** — renders a colored type-only outline of any value (`{ user: { id: number, name: "" } }`). Strings render as `""`, numbers as `number`, booleans as `bool`, arrays as `[type]` of their first element, etc.

## What's in this package

| File                              | Purpose                                                  |
| --------------------------------- | -------------------------------------------------------- |
| [log-json.ts](log-json.ts)        | Main `log()` function and spinner management             |
| [colors.ts](colors.ts)            | `ColorName` enum and ANSI / browser color map            |
| [structure.ts](structure.ts)      | `printJSONStructure`, type detection, indentation helpers |

## License

MIT
