# grab-url · Reactive Loading (Qwik)

`useStore` hands grab a reactive proxy, so the `isLoading`/`error`/data writes it
makes are what re-render the component. The request runs in a `useVisibleTask$`,
which is where a client-side fetch belongs in Qwik.

```bash
npm install
npm run dev
```
