# grab-url · Reactive Loading (Solid)

A `createMutable` store handed straight to grab's `response` option. The store is
a deep proxy, so the `isLoading`/`error`/data writes grab makes to it *are* the
reactive updates — no signal setter in between.

```bash
npm install
npm run dev
```
