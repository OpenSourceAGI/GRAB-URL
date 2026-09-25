# grab-api.js · Hey API SDK

A generated OpenAPI SDK for the [Swagger Petstore](https://petstore3.swagger.io), wired to
[`api2client`](https://github.com/vtempest/GRAB-URL/tree/master/packages/api2client)
so every endpoint is sent by [`grab-api.js`](https://www.npmjs.com/package/grab-api.js) instead of fetch or axios.

```bash
npm install
npm run dev
```

`src/client/` is checked in so the example boots without a codegen step. It is a
three-operation slice of what the generator writes; regenerate the full SDK with:

```bash
npm run codegen   # api2client https://petstore3.swagger.io/api/v3/openapi.json ./src/client
```

`src/main.ts` demonstrates what the grab transport adds on top of the generated code:

| Step | Shows |
|---|---|
| `findPetsByStatus` | Typed response, `cache` / `cacheForTime` per request |
| `getPetById` | Transport failures returned as `{ error }` with the real status |
| `addPet` | `grab.mock["/pet"]` stubbing an endpoint with no network and no code change |
| `grab.log` | Every SDK request in one shared log |

Walkthrough: [OpenAPI SDKs](https://grab.js.org/docs/openapi-services).
