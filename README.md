<!-- template-git-repo:badges:start -->
<p align="center">
    <a href="https://deepwiki.com/OpenSourceAGI/GRAB-URL"><img src="https://deepwiki.com/badge.svg" alt="Ask DeepWiki" /></a>
    <a href="https://grab.js.org"><img src="https://img.shields.io/badge/Docs-blue?logo=ReadTheDocs&logoColor=white" alt="Documentation" /></a>
    <a href="https://stackblitz.com/github/OpenSourceAGI/GRAB-URL/tree/master/examples/basic-request"><img height="20px" src="https://developer.stackblitz.com/img/open_in_stackblitz.svg" alt="Open in StackBlitz" /></a>
    <a href="https://codespaces.new/OpenSourceAGI/GRAB-URL"><img height="20px" src="https://github.com/codespaces/badge.svg" alt="Open in GitHub Codespaces" /></a>
    <br />
    <a href="https://www.npmjs.com/package/grab-url"><img src="https://img.shields.io/npm/dm/grab-url.svg" alt="NPM Monthly Downloads" /></a>
    <a href="https://www.npmjs.com/package/grab-url"><img src="https://img.shields.io/npm/v/grab-url.svg" alt="npm version" /></a>
    <a href="https://www.npmjs.com/package/grab-url"><img src="https://img.shields.io/npm/dt/grab-url.svg" alt="NPM Total Downloads" /></a>
    <a href="https://www.npmjs.com/package/grab-url"><img src="https://img.shields.io/npm/types/grab-url" alt="TypeScript types" /></a>
    <a href="https://packagephobia.com/result?p=grab-url"><img src="https://packagephobia.com/badge?p=grab-url" alt="Install size" /></a>
    <a href="https://codecov.io/gh/OpenSourceAGI/GRAB-URL"><img src="https://codecov.io/gh/OpenSourceAGI/GRAB-URL/graph/badge.svg" alt="Coverage" /></a>
    <a href="https://github.com/OpenSourceAGI/GRAB-URL/actions/workflows/tests.yml"><img src="https://github.com/OpenSourceAGI/GRAB-URL/actions/workflows/tests.yml/badge.svg?branch=master" alt="CI status" /></a>
    <br />
    <a href="https://github.com/OpenSourceAGI/GRAB-URL/stargazers"><img src="https://img.shields.io/github/stars/OpenSourceAGI/GRAB-URL" alt="GitHub Stars" /></a>
    <a href="https://github.com/OpenSourceAGI/GRAB-URL/forks"><img src="https://img.shields.io/github/forks/OpenSourceAGI/GRAB-URL" alt="GitHub Forks" /></a>
    <a href="https://github.com/OpenSourceAGI/GRAB-URL/graphs/contributors"><img src="https://img.shields.io/github/contributors/OpenSourceAGI/GRAB-URL" alt="Contributors" /></a>
    <a href="https://github.com/OpenSourceAGI/GRAB-URL/issues"><img src="https://img.shields.io/github/issues/OpenSourceAGI/GRAB-URL?logo=github" alt="GitHub Issues" /></a>
    <a href="https://github.com/OpenSourceAGI/GRAB-URL/pulls"><img src="https://img.shields.io/github/issues-pr/OpenSourceAGI/GRAB-URL?logo=github&label=PRs" alt="Open Pull Requests" /></a>
    <a href="https://github.com/OpenSourceAGI/GRAB-URL/pulls?q=is%3Apr+is%3Aclosed"><img src="https://img.shields.io/github/issues-pr-closed/OpenSourceAGI/GRAB-URL?logo=github&label=PRs%20merged&color=8957e5" alt="Merged Pull Requests" /></a>
    <a href="https://github.com/OpenSourceAGI/GRAB-URL/discussions"><img src="https://img.shields.io/github/discussions/OpenSourceAGI/GRAB-URL" alt="GitHub Discussions" /></a>
    <a href="https://github.com/OpenSourceAGI/GRAB-URL/graphs/contributors"><img src="https://img.shields.io/github/commit-activity/m/OpenSourceAGI/GRAB-URL" alt="Commit activity" /></a>
    <a href="https://github.com/OpenSourceAGI/GRAB-URL/commits/master/"><img src="https://img.shields.io/github/last-commit/OpenSourceAGI/GRAB-URL.svg" alt="GitHub last commit" /></a>
    <a href="https://discord.gg/SJdBqBz3tV"><img src="https://img.shields.io/discord/1110227955554209923.svg?label=Chat&logo=Discord&colorB=7289da&style=flat" alt="Join Discord" /></a>
    <a href="https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/creating-a-pull-request"><img src="https://img.shields.io/badge/PRs--welcome-brightgreen" alt="PRs Welcome" /></a>
    <br />
    <img src="https://img.shields.io/badge/Claude-D97757?logo=claude&logoColor=white" alt="Claude" /> <img src="https://img.shields.io/badge/npm-CB3837?logo=npm&logoColor=white" alt="npm" /> <img src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white" alt="TypeScript" /> <img src="https://img.shields.io/badge/React-20232A?logo=react&logoColor=white" alt="React" />     <a href="https://grab.js.org"><img src="https://i.imgur.com/mbZKlD0.png" alt="grab.js.org" /></a>
    <br />
        <img src="https://i.imgur.com/xzFQmrD.jpeg" />
</p>
<!-- template-git-repo:badges:end -->

```bash
npm i grab-url
```

### GRAB: Generate Request to API from Browser

**GRAB is the FBEST Request Manager: Functionally Brilliant, Elegantly Simple Tool** — One Function, no dependencies, minimalist syntax, [more features than alternatives](https://grab.js.org/docs/Comparisons)

#### Requests & Data

_Send anything, get back parsed data — no boilerplate per content type._

- **Auto-JSON Convert**: Pass parameters and get response or error in JSON, handling other data types as is.
- **Auto-Unzip**: Automatically extracts ZIP responses into `{ data: { filename: content } }` using archiver-web. Set `unzip: false` to disable.
- **DOM Parsing**: Automatically parses HTML responses. Pass `parseDOM: "selector"` for CSS selector extraction or `parseDOM: false` to disable. Uses linkedom.
- **Request Stategies**: [🎯 Examples](https://grab.js.org/docs/examples) show common stategies like debounce, repeat, proxy, unit tests, interceptors, file upload, etc

#### Reliability & Traffic Control

_Keep flaky networks and click-happy users from cascading into your API._

- **Cancel Duplicates**: Prevent this request if one is ongoing to same path & params, or cancel the ongoing request.
- **Timeout & Retry**: Customizable request timeout, default 30s, and auto-retry on error
- **Regrab On Error**: Regrab on timeout error, or on window refocus, or on network change, or on stale data.
- **Rate Limiting**: Built-in rate limiting to prevent multi-click cascading responses, require to wait seconds between requests.
- **Repeat**: Repeat request this many times, or repeat every X seconds to poll for updates.

#### Performance & UI State

_Fewer round trips, and loading state your components can bind to directly._

- **isLoading Status**: Sets `.isLoading=true` on the pre-initialized response object so you can show a "Loading..." in any framework
- **Frontend Cache**: Set cache headers and retrieve from frontend memory for repeat requests to static data.
- **Pagination Infinite Scroll**: Built-in pagination for infinite scroll to auto-load and merge next result page, with scroll position recovery.
- **Loading Icons**: Import from `grab-url/icons` to get enhanced animated loading icons, including the [quantum sphere](https://grab.js.org/loaders/quantum-sphere) — an interactive 3D orbital loader for React and Svelte that re-rolls its own colors and collapses each ring you hover: `import QuantumOrbital from 'grab-url/icons/quantum-sphere'`.

#### Testing & Debugging

_See every request, fake the ones you don't have yet, and assert on the rest._

- **Mock Server Support**: Configure `window.grab.mock` for development and testing environments
- **DevTools**: `Ctrl+Alt+I` overlays webpage with devtools showing all requests and responses, timing, and JSON structure.
- **Debug Logging**: Adds global `log()` and prints colored JSON structure, response, timing for requests in test.
- **Request History**: Stores all request and response data in global `grab.log` object

#### Setup & Integration

_Drop it into any stack, any runtime, or generate a whole client from a spec._

- **[Agent Skill](https://grab.js.org/docs/claude-skill)** Install the skill into any agent (Claude, Cursor, Gemini, Codex, Antigravity, etc.) with one command: `npx skills add vtempest/GRAB-URL@use-grab-request`. Or copy [SKILL.md](skills/use-grab-request/SKILL.md) into `~/.claude/skills/use-grab-request/SKILL.md`.
- **Globals**: Adds to window in browser or global in Node.js so you only import once: `grab()`, `log()`, `grab.log`, `grab.mock`, `grab.defaults`
- **Base URL Based on Environment**: Configure `grab.defaults.baseURL` once at the top, overide with `SERVER_API_URL` in `.env`.
- **Framework Agnostic**: Alternatives like TanStack work only in component initialization and depend on React & others.
- **[OpenAPI SDKs](https://grab.js.org/docs/openapi-services)**: Generate a typed client from any OpenAPI spec with [Hey API](https://heyapi.dev) and have it send requests with grab instead of axios: `npx api2client ./openapi.yaml ./src/client`. Every endpoint gets caching, retries, rate limiting, dedupe and mocks.

### Examples

**CLI File Downloader**
```bash
npx grab-url https://releases.ubuntu.com/24.04.2/ubuntu-24.04.2-live-server-amd64.iso

# 700+ media sites are detected by domain and pulled with yt-dlp, installed on npm install
npx grab-url "https://www.youtube.com/watch?v=VIDEO_ID"
npx grab-url https://soundcloud.com/artist/track -a mp3

# SFTP, torrents and magnet links (needs aria2c installed)
npx grab-url sftp://user@host/srv/backup.tar.gz --password hunter2
npx grab-url "magnet:?xt=urn:btih:HASH" -d ./downloads

# Archive a page into ./<Page Title>/ - article, cite, transcript and any video
# (needs `npm i -g extract-webpage`; the video step needs yt-dlp)
npx grab-url https://example.com/article --page

# Detach and keep going in the background; Ctrl+C on any transfer offers the same
npx grab-url https://example.com/big.iso --background
npx grab-url --jobs
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
  parseDOM: 'h1' 
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

**Quantum Sphere Loader** — [live demo](https://grab.js.org/loaders/quantum-sphere)

https://github.com/user-attachments/assets/903f2483-6fac-4592-be09-5fdc17196a84

**Set Types for Tooltips on Request & Response**

![types](https://i.imgur.com/IfR4OmC.png)

**Debug Colorized log(JSON)**

![Debug log](https://i.imgur.com/R8Qp6Vg.png)

**Autocomplete option names**

![Autocomplete](https://i.imgur.com/XlxILJ0.png)

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
