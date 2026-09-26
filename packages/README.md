# Packages

- **[api2client](api2client/)**: A Hey API client that sends generated OpenAPI SDK requests through grab instead of axios or fetch. You get caching, retries, rate limiting, deduplication and mocks without changing your generated SDK.

- **[archiver-web](archiver-web/)**: A universal archive extractor and creator for the browser, built on JSZip. It runs entirely on the frontend with no WASM.

- **[grab-api](grab-api/)**: The standalone `grab()` request function: one function, zero dependencies, with auto-JSON, dedupe, caching, retries, rate limiting, mocks and pagination. It is the core of grab-url without the loading icons.

- **[grab-url](grab-url/)**: The main grab-url library for making API requests from the browser or Node.js with a minimal, one-function syntax. It is slim by default, and `grab-url/full` adds DOM and zip features.

- **[grab-url-cli](grab-url-cli/)**: The grab-url transfer CLI for resumable HTTP/SFTP downloads, torrents and magnets via aria2c, 700+ media sites via yt-dlp, and whole-page archiving. It ships as its own package so importing grab-url stays a small library.

- **[loading-animations](loading-animations/)**: Tree-shakable SVG loading spinners plus frame data for CLI terminal spinners. It has zero dependencies.

- **[log-json](log-json/)**: A tiny colorized logger (`@grab-url/log`) that works in both the browser and Node.js. For objects it prints a compact, color-coded view of the JSON's structure alongside the pretty-printed JSON.

- **[quantum-sphere-loading-animation](quantum-sphere-loading-animation/)**: A parabolic spherical orbital loading component for React and Svelte. Its design is inspired by the quantum superposition of atomic orbitals.
