# Packages

- **[api2client](api2client/)** — A Hey API client that sends generated OpenAPI SDK requests through `grab()` instead of axios or fetch. You get caching, retries, rate limiting, deduplication and mocks on every generated endpoint.

- **[archiver-web](archiver-web/)** — An archive extractor and creator for the browser, built on JSZip. It runs entirely on the frontend, with no WASM and no server.

- **[grab-api](grab-api/)** — Publishes `grab-api.js`, which is the `grab()` request function without the loading icons. It has zero dependencies and includes auto-JSON, dedupe, caching, retries, rate limiting, mocks and pagination.

- **[grab-url](grab-url/)** — The main package: `grab()` and `log()`, plus tree-shakable SVG loading spinners and the quantum-sphere loader. It's one function with zero dependencies and a minimalist syntax, and it's about 5 kB gzipped.

- **[grab-url-cli](grab-url-cli/)** — The `grab-url` terminal downloader, which resumes HTTP/SFTP downloads and handles torrents and magnet links through aria2c. It also pulls from 700+ media sites through yt-dlp and archives whole web pages.

- **[loading-animations](loading-animations/)** — Tree-shakable SVG loading spinners, plus spinner frame data for terminal CLIs. It has zero dependencies, so you only ship the animations you import.

- **[log-json](log-json/)** — Publishes `@grab-url/log`, a tiny colorized logger for both the browser and Node.js. When you log an object, it shows a color-coded outline of the JSON's structure next to the pretty-printed data.

- **[quantum-sphere-loading-animation](quantum-sphere-loading-animation/)** — Publishes `quantum-sphere-loading-icon`, a 3D loading component for React and Svelte. Its parabolic, spherical orbits are inspired by the quantum superposition of atomic orbitals.
