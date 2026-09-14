# This folder is only the GitHub Pages redirect

The documentation site lives in [`../grab-help-docs`](../grab-help-docs) — a
Next.js + Fumadocs app deployed to <https://grab.js.org>.

GitHub Pages is configured to deploy from this branch's `/docs` folder, and
`/docs` is the only folder name it accepts besides the repository root, so this
folder stays behind with `_config.yml` and an `index.html` that redirects to
grab.js.org. Edit the docs in `grab-help-docs/content/docs/`.
