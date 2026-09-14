<!-- template-git-repo:badges:start -->
<p align="center">
    <a href="https://grab.js.org"><img src="https://img.shields.io/badge/Docs-blue?logo=ReadTheDocs&logoColor=white" alt="Documentation" /></a>
    <a href="https://stackblitz.com/github/OpenSourceAGI/GRAB-URL/tree/master/packages/loading-animations"><img height="20px" src="https://developer.stackblitz.com/img/open_in_stackblitz.svg" alt="Open in StackBlitz" /></a>
    <br />
    <a href="https://www.npmjs.com/package/loading-animations"><img src="https://img.shields.io/npm/dm/loading-animations.svg" alt="NPM Monthly Downloads" /></a>
    <a href="https://www.npmjs.com/package/loading-animations"><img src="https://img.shields.io/npm/v/loading-animations.svg" alt="npm version" /></a>
    <a href="https://www.npmjs.com/package/loading-animations"><img src="https://img.shields.io/npm/dt/loading-animations.svg" alt="NPM Total Downloads" /></a>
    <a href="https://www.npmjs.com/package/loading-animations"><img src="https://img.shields.io/npm/types/loading-animations" alt="TypeScript types" /></a>
    <a href="https://packagephobia.com/result?p=loading-animations"><img src="https://packagephobia.com/badge?p=loading-animations" alt="Install size" /></a>
    <br />
    <a href="https://github.com/OpenSourceAGI/GRAB-URL/stargazers"><img src="https://img.shields.io/github/stars/OpenSourceAGI/GRAB-URL" alt="GitHub Stars" /></a>
    <a href="https://github.com/OpenSourceAGI/GRAB-URL/issues"><img src="https://img.shields.io/github/issues/OpenSourceAGI/GRAB-URL?logo=github" alt="GitHub Issues" /></a>
    <a href="https://github.com/OpenSourceAGI/GRAB-URL/pulls"><img src="https://img.shields.io/github/issues-pr/OpenSourceAGI/GRAB-URL?logo=github&label=PRs" alt="Open Pull Requests" /></a>
    <a href="https://github.com/OpenSourceAGI/GRAB-URL/pulls?q=is%3Apr+is%3Aclosed"><img src="https://img.shields.io/github/issues-pr-closed/OpenSourceAGI/GRAB-URL?logo=github&label=PRs%20merged&color=8957e5" alt="Merged Pull Requests" /></a>
    <a href="https://github.com/OpenSourceAGI/GRAB-URL/discussions"><img src="https://img.shields.io/github/discussions/OpenSourceAGI/GRAB-URL" alt="GitHub Discussions" /></a>
    <a href="https://github.com/OpenSourceAGI/GRAB-URL/commits/master/"><img src="https://img.shields.io/github/last-commit/OpenSourceAGI/GRAB-URL.svg" alt="GitHub last commit" /></a>
    <br />
    <img src="https://img.shields.io/badge/npm-CB3837?logo=npm&logoColor=white" alt="npm" /> <img src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white" alt="TypeScript" /> <img src="https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white" alt="Vite" />
</p>
<!-- template-git-repo:badges:end -->

# @grab-url/loading-animations

Two tree-shakable collections of loading animations:

- **SVG** — 25 animated SVG spinners for the browser, each rendered by a single function call. Customize colors, size, width, and height per call.
- **CLI** — Unicode/emoji spinner frame data for terminal UIs (used by [`@grab-url/cli`](../grab-url-cli)).

Both are zero-dependency and named-exported so bundlers strip out anything you don't use.

## Install (within the monorepo)

```json
{ "dependencies": { "@grab-url/loading-animations": "*" } }
```

## SVG usage

```ts
import { loadingSpinner, loadingRing, loadingPacman } from "@grab-url/loading-animations/svg";
// Inside this monorepo you can also import straight from source (no build step):
// import { loadingSpokes } from "loading-animations/svg/src";

// Returns an SVG string you can drop into innerHTML / dangerouslySetInnerHTML
element.innerHTML = loadingSpinner({
  colors: ["#0099e5", "#ff4c4c"], // override existing colors in order
  size: 100,                       // shorthand for width + height
});

// Or specify dimensions independently
element.innerHTML = loadingRing({ width: 64, height: 64 });
```

### Available SVG spinners

**Multi-color** — `loadingBouncyBall`, `loadingDoubleRing`, `loadingEclipse`, `loadingEllipsis`, `loadingFloatingSearch`, `loadingGears`, `loadingInfinity`, `loadingOrbital`, `loadingPacman`, `loadingPulseBars`, `loadingRedBlueBall`, `loadingReloadArrow`, `loadingRing`, `loadingRipple`, `loadingSpinner`, `loadingSpinnerOval`, `loadingSquareBlocks`.

**Monochrome** — minimal single-color spinners that pair with the [`Spinner`](#react-spinner) React component. Each contains exactly one hex color, so `colors: ["#..."]` restyles the whole animation:
`loadingSpokes`, `loadingCircleNotch`, `loadingPinwheel`, `loadingCircleTrack`, `loadingDotsBounce`, `loadingPulseRing`, `loadingEqualizerBars`, `loadingInfiniteDash`.

| Export | Look |
| --- | --- |
| `loadingSpokes` | 8 radiating spokes, rotating (the default spinner) |
| `loadingCircleNotch` | Open circular arc, rotating |
| `loadingPinwheel` | Three interlocking arcs inside a circle, rotating |
| `loadingCircleTrack` | Rotating arc over a dimmed full-circle track |
| `loadingDotsBounce` | Three dots bouncing in sequence |
| `loadingPulseRing` | Two rings expanding and fading outward |
| `loadingEqualizerBars` | Three bars pulsing like an equalizer |
| `loadingInfiniteDash` | Dash travelling around an infinity loop |

Each accepts a `LoadingOptions` object:

```ts
type LoadingOptions = {
  colors?: string[]; // hex colors to substitute, in source order
  width?: number;    // default 200
  height?: number;   // default 200
  size?: number;     // shorthand: sets both width and height
};
```

The raw `.svg` files also live in [src/svg/](src/svg/) if you need to reference them directly.

## CLI usage

Each terminal spinner is either a plain `string` (1 char per frame) or a `[string, n]` tuple where `n` is the character length of each frame.

```js
import { dots, bouncingBar } from "@grab-url/loading-animations";

// Plain string (n = 1) — split per character
const frames = [...dots]; // ["⠋", "⠙", "⠹", ...]

// Tuple — split into chunks of n characters
const [data, n] = Array.isArray(bouncingBar) ? bouncingBar : [bouncingBar, 1];
const frames2 = data.match(new RegExp(`.{1,${n}}`, "g"));
```

Includes `dots`, `dots2`–`dots14`, `dotsCircle`, `sand`, `line`, `pipe`, `simpleDotsScrolling`, `star`, `flip`, `growVertical`, `growHorizontal`, `balloon`, `balloon2`, `noise`, `boxBounce`, `boxBounce2`, `triangle`, `arc`, `circle`, `squareCorners`, `circleQuarters`, `circleHalves`, `squish`, `toggle3`–`toggle8`, and more.

## React `Spinner`

A React wrapper over the eight monochrome variants ships with the docs site at
[`docs/components/ui/spinner.tsx`](../../docs/components/ui/spinner.tsx). It is a plain
shadcn/ui-style component — copy it into any project with Tailwind CSS and `lucide-react`:

```tsx
import { Spinner } from "@/components/ui/spinner";

<Spinner />                              // spokes
<Spinner variant="circle" />             // rotating arc
<Spinner variant="pinwheel" />
<Spinner variant="circle-filled" />      // arc over a dimmed track
<Spinner variant="ellipsis" />           // bouncing dots
<Spinner variant="ring" />               // expanding rings
<Spinner variant="bars" />               // equalizer bars
<Spinner variant="infinite" />           // infinity dash
<Spinner variant="bars" size={48} className="text-primary" />
```

Every variant inherits `currentColor`, so `className="text-primary"` (or any text color)
is all it takes to restyle it. See the live grid at
[/docs/loading-animations](https://grab-url.com/docs/loading-animations).

## Regenerating the barrel

After adding or editing an `.svg` file in [src/svg/](src/svg/), regenerate
[src/svg/index.ts](src/svg/index.ts):

```sh
npx export-svg-typescript@latest -i ./src/svg -o ./src/svg/index.ts
```

## What's in this package

| Path                                                        | Purpose                                          |
| ----------------------------------------------------------- | ------------------------------------------------ |
| [src/svg/index.ts](src/svg/index.ts)                         | Auto-generated barrel of customizable SVG spinners |
| [src/svg/*.svg](src/svg/)                                    | Source SVG files                                 |
| [src/cli/index.js](src/cli/index.js)                         | Barrel re-export for terminal spinners           |
| [src/cli/loading-animations-emojis.js](src/cli/loading-animations-emojis.js) | Frame data for terminal spinners         |

## License

MIT
