# grab-url · Reactive Loading (Angular)

A standalone component whose `signal` is fed by grab's `response` option. grab
calls it with a new object for each state the request reaches — loading, then
data or error — so `signal.set()` is all the wiring the template needs.

Vite + [`@analogjs/vite-plugin-angular`](https://analogjs.org), so it runs the
same way as the other examples here.

```bash
npm install
npm run dev
```
