# Documentation — Where It Goes

All documentation lives in the user guide, **`grab-help-docs/content/docs`** — a
Next.js + Fumadocs app. Nothing else in this repo is documentation prose, with
the package `README.md`s and the agent skill as the two deliberate exceptions.

## `docs/` at the root is gone

It held three files and no documentation: a Jekyll `_config.yml`, an
`index.html` redirect to grab.js.org, and a `README.md` describing itself.

They were left over from when GitHub Pages deployed from a branch folder —
`/docs` being the only folder name Pages accepts besides the repository root.
**Pages no longer works that way.** Settings → Pages → Source is "GitHub
Actions", and `.github/workflows/pages.yml` publishes the static export built
from `grab-help-docs/out`. Nothing read `docs/` at all, so PR #47 deleted the
folder (commit `c894e60`).

Verify that claim rather than trusting this paragraph: the `Deploy docs to
Pages` workflow ends in `actions/deploy-pages@v5`, which **only succeeds when
Source is "GitHub Actions"**, and it is green on `master`.

So: put no documentation here, and do not recreate the folder.

## grab.js.org is down, and `docs/` is still why

Every deployment of the `grab-url` Vercel project
(`prj_sZH39yA62rJ7ZKn3pjFpLVYH1320`, team `vtempest-apps`) is failing, production
included, and has been since the docs app was renamed `docs/` →
`grab-help-docs/`. Because production never built, **https://grab.js.org serves
Vercel's `DEPLOYMENT_NOT_FOUND` 404** — the DNS is fine, there is simply nothing
behind it. `js-org/js.org`'s `cnames_active.js` maps
`"grab": "cname.vercel-dns.com"`, so the hostname resolves into Vercel and
nowhere else.

**First it pointed at `docs/`.** While that folder existed turbo resolved no
package from it (`docs/` matched neither `packages/*` nor `grab-help-docs` in
the workspace globs), so it reported `No tasks were executed as part of this
run`, never wrote a `.next`, and Vercel failed with:

```
The file "/vercel/path0/docs/.next/routes-manifest.json" couldn't be found.
```

**Then #47 deleted the folder** and the build failed one step earlier, right
after the clone — same cause, louder error:

```
The specified Root Directory "docs" does not exist. Please update your Project Settings.
```

Same cause, louder error. **This is a dashboard setting, not a diff — no commit
can fix it**, and deleting `docs/` did not fix it either. In Vercel → the
`grab-url` project → Settings:

1. Build and Deployment → set **Root Directory** to `grab-help-docs` (it is
   `docs`).
2. Leave **Include source files outside of the Root Directory in the Build
   Step** enabled — the install and the turbo build both reach up to the repo
   root.
3. Clear the **Install Command** override (`npm install --prefix=..`), and
   leave **Build Command** and **Output Directory** unset.
4. Domains → check that **`grab.js.org` is attached to this project** and
   assigned to production. The API lists only the two generated hostnames
   (`grab-url-vtempest-apps.vercel.app`,
   `grab-url-git-master-vtempest-apps.vercel.app`), so it probably is not; a
   green build alone will not put the site back on grab.js.org.
5. Redeploy `master`.

`grab-help-docs/vercel.json` supplies the three build settings itself:

`vercel.json` **at the repository root** — the file Vercel reads when the Root
Directory is the repo root — now supplies the three settings that were missing:

| Setting | Value | Why |
| --- | --- | --- |
| `installCommand` | `npm ci` | Same reason as the Pages workflow: the lockfile pins a compatible `fumadocs-openapi` / `fumadocs-ui` pair and a floating resolve does not. |
| `buildCommand` | `npx turbo run build --filter=grab-help-docs` | The root `build` script is `vite build`; only this reaches the Next.js app. |
| `outputDirectory` | `grab-help-docs/.next` | Where that build actually writes, relative to the repo root. |
| `build.env.VERCEL_PREVIEW_FEEDBACK_ENABLED` | `0` | Turns the preview toolbar's comments off. Next 16 uploads static files as immutable, which the comment injector cannot patch, so with it on every *preview* deployment dies after a successful build on `Cannot patch preview comments when immutable static file upload is enabled`. Production never patched them, so this changes nothing there. |

So the deploy is config-in-the-repo now, and no dashboard visit is needed as
long as **Root Directory stays empty (the repository root)**. Two settings
still have to stay as they are, and both are dashboard-only:

1. **Root Directory** — empty. Setting it back to a subdirectory makes Vercel
   read that subdirectory's `vercel.json` instead of this one.
2. **Install Command / Build Command / Output Directory overrides** — unset. A
   dashboard override beats `vercel.json`; the old `npm install --prefix=..`
   override in particular resolves above `/vercel/path0` from the repo root.

`grab-help-docs/vercel.json` is kept as the equivalent config for the other
arrangement — Root Directory `grab-help-docs`, paths relative to it. It is
inert while the Root Directory is the repo root. Whichever directory Vercel is
pointed at, one of the two files describes the build.

The GitHub Pages deploy of the same docs is **green** and unaffected — it is the
working copy of the site while Vercel is broken. It is not a drop-in
replacement for grab.js.org, though: moving the hostname there means adding the
custom domain in Settings → Pages (so `configure-pages` stops emitting the
`/GRAB-URL` base path) *and* a PR against `js-org/js.org` repointing the CNAME
at `opensourceagi.github.io`, and it costs the middleware, the Server Action and
the POST route handler that `build-static-pages.mjs` prunes. Fixing the Vercel
project is the smaller change.

## Adding a page

1. Write `grab-help-docs/content/docs/<slug>.mdx` with frontmatter — `title` is
   required by `frontmatterSchema` in `source.config.ts`; `icon` takes a Lucide
   name.
2. Add the slug to `content/docs/meta.json`. Sections are `---Label---`
   separators; a subdirectory is included with `...<dir>` and needs its own
   `meta.json`.
3. MDX rules apply: a bare `{` or `<` outside a code fence is parsed as JSX —
   this is the specific reason Jekyll is kept away from the real docs.

## The generated skill page

`content/docs/claude-skill.mdx` is **generated**. The source of truth is
`skills/use-grab-request/SKILL.md`; `scripts/sync-skill-docs.mjs` regenerates the
page and writes the header telling you so.

```bash
npm run make:skill            # regenerate
node scripts/sync-skill-docs.mjs --check   # fail if stale, instead of writing
```

Edit the skill, regenerate, commit both. Editing the `.mdx` directly is undone by
the next `npm run make`.

## Two deployments, one source

| Target | Built by | Notes |
| --- | --- | --- |
| **https://grab.js.org** (Vercel) | `grab-help-docs/vercel.json` → `turbo run build --filter=grab-help-docs` | The full app — middleware, a Server Action and a POST route handler all work. **Currently down**: Root Directory is still `docs`, which no longer exists, so production never built and the hostname answers `DEPLOYMENT_NOT_FOUND`. See [the section above](#grabjsorg-is-down-and-docs-is-still-why). |
| **GitHub Pages** | `.github/workflows/pages.yml` → `grab-help-docs/scripts/build-static-pages.mjs` → `actions/deploy-pages@v5` | A static export, served from `grab-help-docs/out`. `output: 'export'` supports none of those three server pieces, so the script **prunes them from the working tree** before building. It is destructive by design and refuses to run outside CI without `--force`. Green on `master`. |

The Pages workflow uses `npm ci`, not a floating install: `package-lock.json`
pins a compatible `fumadocs-openapi` / `fumadocs-ui` pair and a fresh resolve
picks versions that break the build.

## Package READMEs and the root README

Each `packages/*/README.md` documents that folder's own surface. The root
`README.md` is the npm landing page and the feature list — when you add a
user-visible capability, it belongs there, in the relevant docs page, and in the
skill if an agent would use it.
