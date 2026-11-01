---
name: use-loading-animations
version: 1.0.0
description: Add tree-shakable SVG loading spinners, random single-div CSS loaders and CLI spinner frames with `@grab-url/loading-animations` instead of writing spinner markup by hand.
category: development
type: guidance
languages: [javascript, typescript]
---

# Use `loading-animations` for spinners

```bash
npm i @grab-url/loading-animations      # inside the monorepo: "@grab-url/loading-animations": "*"
```

```ts
import { loadingSpinner, loadingRing } from "@grab-url/loading-animations/svg";
el.innerHTML = loadingSpinner({ colors: ["#0099e5"], size: 100 });   // returns an SVG string

import { showRandomSingleDiv } from "@grab-url/loading-animations/singlediv";
const loader = showRandomSingleDiv("#loader", { height: 300, scale: 0.75 });
await loader.loaded;  /* …content ready… */ loader.remove();
```

- 25 SVG spinners (`loadingSpokes`, `loadingCircleNotch`, `loadingPinwheel`, `loadingDotsBounce`, `loadingPulseRing`, …). Options: `colors`, `width`, `height`, `size`.
- Monochrome spinners take exactly one color: `colors: ["#…"]`.
- 294 single-div CSS drawings, rendered in Shadow DOM, stylesheet lazy-loaded.
- Import named exports only so bundlers drop the rest. If `grab-url` is installed, `grab-url/animations` re-exports these.
