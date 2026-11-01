---
name: use-log-json
version: 1.0.0
description: Log strings and objects with colorized output plus a type-only JSON structure outline, in browser and Node, using `@grab-url/log` instead of bare console.log.
category: development
type: guidance
languages: [javascript, typescript]
---

# Use `@grab-url/log`

```bash
npm i @grab-url/log
```

```ts
import { log } from "@grab-url/log";

log("hello", { color: "green" });
log({ user: { id: 1, name: "Ada" } });          // pretty JSON + colored structure outline
log("working…", { startSpinner: true });         // …later:
log("done", { stopSpinner: true });
log("verbose", { hideInProduction: false });     // by default hidden (console.debug) off localhost
```

Also exports `ColorName`, `getColors()` and `printJSONStructure(value)`. `grab-url` already exposes it as global `log()` — don't install separately in that case. Never log secrets or tokens.
