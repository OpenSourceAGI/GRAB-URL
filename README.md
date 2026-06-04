<p align="center">
    <img width="350px" src="https://i.imgur.com/RH80JGZ.png" />
<h3 align="center">
   <a href="https://grab.js.org">📑 Docs</a>
  <a href="https://grab.js.org/docs/examples">🎯 Examples</a>
</h3>
<p align="center">
  <a href="https://discord.gg/SJdBqBz3tV"><img src="https://img.shields.io/discord/1110227955554209923.svg?label=Chat&logo=Discord&colorB=7289da&style=flat"
          alt="Join Discord" /></a>
  <a href="https://github.com/vtempest/GRAB-URL/discussions"><img alt="GitHub Stars" src="https://img.shields.io/github/stars/vtempest/GRAB-URL" /></a>
  <a href="https://github.com/vtempest/GRAB-URL/discussions"><img alt="GitHub Discussions"
      src="https://img.shields.io/github/discussions/vtempest/GRAB-URL" /></a>
  <br />
  <a href="https://github.com/vtempest/GRAB-URL/pulse"><img src="https://img.shields.io/github/commit-activity/m/vtempest/GRAB-URL" alt="Activity" /></a>
  <a href="https://github.com/vtempest/GRAB-URL/commits/master/"><img src="https://img.shields.io/github/last-commit/vtempest/GRAB-URL.svg" alt="GitHub last commit" /></a>
  <br />
  <img src="https://img.shields.io/badge/Claude-D97757?logo=claude&logoColor=fff" alt="Claude AI">
  <a href="https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/creating-a-pull-request"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs Welcome" /></a>
  <a href="https://codespaces.new/vtempest/GRAB-URL"><img src="https://github.com/codespaces/badge.svg" width="150" height="20" alt="GitHub Codespaces" /></a>
</p>

```bash
npm i grab-url
```

### GRAB: Generate Request to API from Browser

1.  **GRAB is the FBEST Request Manager: Functionally Brilliant, Elegantly Simple Tool**: One Function, no dependencies, minimalist syntax, [more features than alternatives](https://grab.js.org/docs/Comparisons)
2.  **Auto-JSON Convert**: Pass parameters and get response or error in JSON, handling other data types as is.
3.  **isLoading Status**: Sets `.isLoading=true` on the pre-initialized response object so you can show a "Loading..." in any framework
4.  **[Claude Skill](https://grab.js.org/docs/claude-skill)** Copy this link as markdown and paste into ~/.claude/skills/use-grab-request/SKILL.md or similar for Antigravity, Cursor, Gemini, Codex, etc...
5.  **Mock Server Support**: Configure `window.grab.mock` for development and testing environments
6.  **Cancel Duplicates**: Prevent this request if one is ongoing to same path & params, or cancel the ongoing request.
7.  **Timeout & Retry**: Customizable request timeout, default 30s, and auto-retry on error
8.  **DevTools**: `Ctrl+Alt+I` overlays webpage with devtools showing all requests and responses, timing, and JSON structure.
9.  **Request History**: Stores all request and response data in global `grab.log` object
10. **Pagination Infinite Scroll**: Built-in pagination for infinite scroll to auto-load and merge next result page, with scroll position recovery.
11. **Base URL Based on Environment**: Configure `grab.defaults.baseURL` once at the top, overide with `SERVER_API_URL` in `.env`.
12. **Frontend Cache**: Set cache headers and retrieve from frontend memory for repeat requests to static data.
13. **Regrab On Error**: Regrab on timeout error, or on window refocus, or on network change, or on stale data.
14. **Framework Agnostic**: Alternatives like TanStack work only in component initialization and depend on React & others.
15. **Globals**: Adds to window in browser or global in Node.js so you only import once: `grab()`, `log()`, `grab.log`, `grab.mock`, `grab.defaults`
16. **Debug Logging**: Adds global `log()` and prints colored JSON structure, response, timing for requests in test.
17. **Request Stategies**: [🎯 Examples](https://grab.js.org/docs/examples) show common stategies like debounce, repeat, proxy, unit tests, interceptors, file upload, etc
18. **Rate Limiting**: Built-in rate limiting to prevent multi-click cascading responses, require to wait seconds between requests.
19. **Repeat**: Repeat request this many times, or repeat every X seconds to poll for updates.
20. **Loading Icons**: Import from `grab-url/icons` to get enhanced animated loading icons.
21. **Auto-Unzip**: Automatically extracts ZIP responses into `{ data: { filename: content } }` using archiver-web. Set `unzip: false` to disable.
22. **DOM Parsing**: Automatically parses HTML responses. Pass `dom: "selector"` for CSS selector extraction or `dom: false` to disable. Uses linkedom.

### Examples

**CLI File Downloader**
```bash
npx grab-url https://releases.ubuntu.com/24.04.2/ubuntu-24.04.2-live-server-amd64.iso
```


```typescript
import grab from 'grab-url';

let res = $state({}) as {
  results: Array<{title:string}>,
  isLoading: boolean,
  error: string,
};

await grab('search', {
  response: res,
  query: "search words",
  post: true
})

grab('user').then(log)

// Auto-extract ZIP files
const zipData = await grab('https://example.com/archive.zip', { 
  unzip: true 
})
// { data: { "file1.txt": "content...", "file2.js": "..." } }

// Parse HTML and extract elements
const title = await grab('https://example.com', { 
  dom: 'h1' 
})
// { data: "Page Title" }

//in svelte component
{#if res.results}
    {res.results}
{:else if res.isLoading}
    ...
{:else if res.error}
    {res.error}
{/if}

 //Setup Mock testing server, response is object or function
 window.grab.mock["search"] = {
   response: (params) => {
     return { results: [{title:`Result about ${params.query}`}] };
   },
   method: "POST"
 };

 //set defaults for all requests
 grab("", {
   setDefaults: true,
   baseURL: "http://localhost:8080",
   timeout: 30,
   debug: true,
   rateLimit: 1,
   cache: true,
   cancelOngoingIfNew: true,
 });

 grab.defaults.baseURL = "http://localhost:8080/api/";
```

### Screenshots

**Animated SVG Loading Icons with Customizable Colors**

![icons](https://i.imgur.com/OqpWya1.gif)

**Set Types for Tooltips on Request & Response**

![types](https://i.imgur.com/IfR4OmC.png)

**Debug Colorized log(JSON)**

![Debug log](https://i.imgur.com/R8Qp6Vg.png)

**Autocomplete option names**

![Autocomplete](https://i.imgur.com/XlxILJ0.png)

**Hover over options for info**

![Info Tooltip](https://i.imgur.com/vV5jbZo.png)

## Comparison of HTTP Request Libraries

| Feature                  | [GRAB](https://github.com/vtempest/GRAB-URL) | [Axios](https://github.com/axios/axios) | [TanStack Query](https://github.com/TanStack/query) | [SWR](https://github.com/vercel/swr) | [Alova](https://github.com/alovajs/alova) | [SuperAgent](https://github.com/ladjs/superagent) | [Apisauce](https://github.com/infinitered/apisauce) | [Ky](https://github.com/sindresorhus/ky) |
| :----------------------- | :------------------------------------------- | :-------------------------------------- | :-------------------------------------------------- | :----------------------------------- | :---------------------------------------- | :------------------------------------------------ | :-------------------------------------------------- | :--------------------------------------- |
| Size                     | ✅ 4KB                                       | ❌ 13KB                                 | ❌ 39KB                                             | ✅ 4.2KB                             | ✅ 4KB                                    | ❌ 19KB                                           | ❌ 15KB (with axios)                                | ✅ 4KB                                   |
| Zero Dependencies        | ✅ Yes                                       | ❌ No                                   | ❌ No                                               | ❌ No                                | ✅ Yes                                    | ❌ No                                             | ❌ Needs Axios                                      | ✅ Yes                                   |
| isLoading State Handling | ✅ Auto-managed                              | ❌ Manual                               | ✅ Yes                                              | ✅ Yes                               | ✅ Yes                                    | ❌ Manual                                         | ❌ Manual                                           | ❌ Manual                                |
| Auto JSON Handling       | ✅ Automatic                                 | ✅ Configurable                         | ❌ Manual                                           | ❌ Manual                            | ✅ Automatic                              | ✅ Automatic                                      | ✅ Automatic                                        | ✅ Automatic                             |
| Request Deduplication    | ✅ Built-in                                  | ❌ No                                   | ✅ Yes                                              | ✅ Yes                               | ✅ Yes                                    | ❌ No                                             | ❌ No                                               | ❌ No                                    |
| Caching                  | ✅ Multi-level                               | ❌ No                                   | ✅ Advanced                                         | ✅ Advanced                          | ✅ Multi-level                            | ❌ No                                             | ❌ No                                               | ❌ No                                    |
| Mock Testing             | ✅ Easy setup                                | ❌ Needs MSW/etc                        | ❌ Needs MSW/etc                                    | ❌ Needs MSW/etc                     | ⚠️ Basic                                  | ❌ Needs separate lib                             | ❌ Needs separate lib                               | ❌ Needs MSW/etc                         |
| Rate Limiting            | ✅ Built-in                                  | ❌ Manual                               | ❌ Manual                                           | ❌ Manual                            | ⚠️ Basic                                  | ❌ Manual                                         | ❌ Manual                                           | ❌ Manual                                |
| Automatic Retry          | ✅ Configurable                              | ⚠️ Via interceptors                     | ✅ Built-in                                         | ✅ Built-in                          | ✅ Built-in                               | ✅ Built-in                                       | ❌ Manual                                           | ✅ Built-in                              |
| Request Cancellation     | ✅ Auto + manual                             | ✅ Manual                               | ✅ Automatic                                        | ✅ Automatic                         | ✅ Manual                                 | ✅ Manual                                         | ✅ Manual                                           | ✅ Manual                                |
| Pagination Support       | ✅ Infinite scroll                           | ❌ Manual                               | ✅ Advanced                                         | ⚠️ Basic                             | ✅ Built-in                               | ❌ Manual                                         | ❌ Manual                                           | ❌ Manual                                |
| Interceptors             | ✅ Advanced                                  | ✅ Advanced                             | ⚠️ Limited                                          | ⚠️ Limited                           | ✅ Advanced                               | ✅ Plugins                                        | ✅ Transforms                                       | ✅ Hooks system                          |
| Debug Logging            | ✅ Colored output                            | ⚠️ Basic                                | ✅ DevTools                                         | ✅ DevTools                          | ⚠️ Basic                                  | ⚠️ Basic                                          | ⚠️ Basic                                            | ⚠️ Basic                                 |
| Request History          | ✅ Built-in                                  | ❌ Manual                               | ✅ DevTools                                         | ✅ DevTools                          | ❌ Manual                                 | ❌ Manual                                         | ❌ Manual                                           | ❌ Manual                                |
| Easy Syntax              | ✅ Minimal                                   | ⚠️ Medium                               | ❌ High                                             | ❌ High                              | ⚠️ Medium                                 | ⚠️ Medium                                         | ✅ Low                                              | ✅ Minimal                               |

**Stop trying to make fetch happen!** [\*](https://knowyourmeme.com/memes/stop-trying-to-make-fetch-happen)

**Why fetch things when you can just GRAB?**

**Debugging requests is a bitch. [Make the switch!](https://grab.js.org/docs/Comparisons)**

🌟 Star this repo so it will grow and get updates!
