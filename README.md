# Synaps-X

Retro-futurist neural journal. A phone-first web editor where every thought is a **semantic block** (title, heading, body, quote, code, checklist, callout, image, caption), color-coded in a single vertical stream.

This README is a project handoff. It describes the codebase as it exists today — not a roadmap.

---

## Stack

| Layer | Choice |
|---|---|
| UI | React 19 |
| App framework | [TanStack Start](https://tanstack.com/start) (file routes + Vite) |
| Bundler | Vite 8 |
| Styling | Tailwind CSS v4 |
| State | Zustand 5 with `persist` |
| Icons | lucide-react |
| Language | TypeScript (strict) |
| Node | **22** (developed on 22.23.2). npm 10. Package manager is **npm** (lockfile is `package-lock.json`). |

It is a **web app**, not a native app.

- **PWA:** partial. The Grok App Builder injects a web manifest (`display: standalone`, theme color, 180×180 icon) and Apple web-app meta tags. There is **no service worker** and **no offline cache**.
- **Android/iOS wrapper:** none. No Capacitor, Cordova, React Native, or Expo.
- **APK / AAB:** cannot be produced from this repo as-is.

Auth and database are **off**. Better Auth, Neon/PGLite, and the `migrations/auth/` SQL are unused scaffold. All user data lives in the browser.

---

## Local setup

```bash
# 1. Node 22+
node -v   # expect v22.x

# 2. Install
npm install

# 3. Dev server (binds 0.0.0.0:8080 in this repo's vite config)
npm run dev
```

Open the printed local URL. First load shows two seeded notes from `src/lib/editor/seed.ts`.

### Production build

```bash
npm run build
npm run preview          # vite preview (127.0.0.1:8081 in this config)
```

Other scripts: `npm run typecheck`, `npm run lint`, `npm test` (scaffold script tests, not editor tests).

`npm run build` also runs `npm run db:migrate`. With no `DATABASE_URL` and no top-level SQL in `migrations/`, that step is a no-op.

### Environment variables

**None required for this app.**

Optional platform flags that exist only because of the App Builder scaffold:

- `VITE_AUTH_ENABLED` — currently `"false"` (see `.grok/app-env.json`). Do not turn this on unless you also wire auth routes.
- `DATABASE_URL` — unused. Product code never queries the database.

Do not create a `.env` with secrets. There are no API keys in this project.

---

## Data storage

Key: `localStorage["synaps-x-journal"]` (Zustand persist, JSON, version `2`).

| Data | Storage | Survives refresh | Survives close/reopen | Notes |
|---|---|---|---|---|
| Notes + project list | localStorage | yes | yes | Full `Note[]` |
| Blocks, order, types | localStorage | yes | yes | Nested on each note |
| Uploaded images | IndexedDB blobs via `imageAssetId` | yes | yes | JPEG, not base64 in notes |
| Seed demo images | static files under `public/demo/` | yes | yes | Stored as paths (`/demo/bridge.jpg`) |
| Captions | localStorage | yes | yes | Caption blocks |
| Image display size | localStorage | yes | yes | `imageWidth` 40–100, CSS only |
| Type scale / rails / compact | localStorage | yes | yes | Global, not per-note |
| Focus mode | **in-memory** | no | no | Forced `false` on persist |
| Active note id | localStorage | yes | yes | |
| Active block / caret / tab | in-memory | no | no | Tab resets to editor |
| MCP chip | in-memory constant `true` | n/a | n/a | Visual only |
| Sync/Online chip | in-memory (`saved`/`saving`) | n/a | n/a | Local debounce, not a network |

**Also used:** IndexedDB `synaps-x-images` for uploaded binaries. No server database. Legacy `data:` URLs migrate into IndexedDB once; originals are kept until copy succeeds.

Hydration: `skipHydration: true`, then `NoteShell` calls `persist.rehydrate()` on mount. Until that finishes, seed data is shown, then replaced.

**Origin warning.** localStorage is per-origin. Notes created in a Grok preview, `localhost`, and a Vercel deploy are **three different stores**. Downloading this repo does **not** download notes you typed in the preview. Export markdown (or copy the `synaps-x-journal` localStorage value) before switching origins.

---

## Major features (what is actually implemented)

- Semantic block editor with per-type color, rails, and type switching (toolbar, slash commands, block menu).
- Enter splits a block. Shift+Enter inserts a newline. Backspace at start merges with previous. Delete at end merges with next.
- Arrow up/down at line edges moves the caret between blocks, preserving column.
- Ctrl/Cmd+B / I / U wrap selection. Multiline paste splits into body blocks. Image paste/drop/file picker inserts an image + empty caption.
- Checklists, code (monospace, no syntax highlight), quotes, callouts, title/heading/subheading.
- Block move, duplicate, delete. Stable block ids (`b_<12 hex chars>`).
- Notes library: create, open, delete (cannot delete the last note). Title is derived from the first title/heading block. Project name is editable in the context bar.
- Neural Index: linear map of the **same** blocks. Tap a node to jump to the editor. Link icon toggles `linkedNodeIds` on the active block. No graph database.
- Settings: type scale S/M/L, block rails, compact spacing, focus mode, markdown export, restore demo.
- Keyboard inset handling so the toolbar sits above the mobile keyboard.

---

## Known limitations

- **Images.** Uploads are JPEG blobs in IndexedDB (max edge 1400px, quality 0.78). Notes store `imageAssetId` only. Quota errors surface as an in-app warning. IndexedDB quota is typically hundreds of MB to a few GB per origin.
- Resize slider changes **display width only**. The JPEG source is not re-encoded. Images are shown `aspect-square object-cover` (visual crop).
- PNG transparency and GIF/WebP animation are flattened to JPEG on upload.
- Markdown export writes `![alt](synaps-asset:<id>)` for uploads (or `/demo/...` for seed images). It does not bundle image files. Text reconstructs from `.md`; binaries stay on-device.
- No cloud sync, no accounts, no multi-device.
- "MCP Active" and "Online / Sync" are UI chrome, not network status.
- Code blocks have no language picker or highlighting.
- Slash menu does not convert to `image` (use the toolbar or block menu).
- No service worker / true offline PWA.
- Cannot emit an APK from this repo.
- Not connected to GitHub (this workspace has no `.git`).

---

## Image system

`src/lib/editor/images.ts`

1. File is read with `FileReader.readAsDataURL`.
2. Drawn to a canvas, scaled so the long edge ≤ 1400, exported `image/jpeg` @ 0.78.
3. Stored on the block as `imageSrc` (data URL) plus `imageAlt` and `imageWidth`.
4. Persisted inside the note JSON in localStorage.

Object URLs are **not** used for storage. The only `URL.createObjectURL` is the markdown download blob, revoked immediately after click.

There is no count cap in code. Practical cap = localStorage quota.

---

## Export

Settings → **Export .md** downloads `{note-title}.md`.

Mapping:

- title/heading/subheading → `#` / `##` / `###`
- quote / callout → blockquote
- code → fenced ```
- checklist → `- [x]` / `- [ ]`
- image → `![alt](src)` (data URL or `/demo/...`)
- caption → italic line
- body → plain text

Inline `**bold**` `*italic*` `_underline_` `` `code` `` `[text](url)` `#tags` are stored as characters in `content` and therefore survive export.

**Full backup including images:** copy the `synaps-x-journal` localStorage JSON, or add a future zip exporter (markdown + decoded JPEGs). The current `.md` download is not a complete binary backup.

---

## PWA / Android

### Current

| Piece | Status |
|---|---|
| Manifest | Injected at `/__grok/manifest.webmanifest` (`display: standalone`) |
| Theme color | `#07090d` in `__root.tsx`, `#000000` in the injected manifest |
| Icons | `/__grok/icon-180.png` (180×180 only) + `/favicon.svg` |
| Service worker | **None** |
| Offline caching | **None** |
| Installable on Android | Maybe as a home-screen shortcut via Chrome; not a packaged APK |

### Smallest path to a real home-screen PWA

1. Add `public/manifest.webmanifest` with `name`, `short_name`, `start_url: "/"`, `display: "standalone"`, `theme_color`, and **192 + 512** PNG icons.
2. Add a service worker (Vite PWA / Workbox) that precaches the shell and `/demo/*`.
3. Register it from the client entry. Serve over HTTPS.

Do this **after** the project is on its own domain. The Grok injector already provides a thin install tutorial at `?install=1`.

### Cleanest APK path (do not rewrite)

1. **PWA (now)** — install from Chrome. Least work, no APK.
2. **Capacitor wrapper (recommended if you need Play Store)** — keep this React web app, add `@capacitor/core` + `@capacitor/android`, point `webDir` at the Vite/Nitro build output, generate an Android project. localStorage still works inside the WebView; move images to Capacitor Filesystem later if quota hurts.
3. **Native rewrite** — destructive. Do not do this for this codebase.

---

## Deployment

Vite is configured with `nitro({ preset: "vercel" })` on build/preview. **Vercel is the easiest target.**

Also possible with extra adapter work: Netlify, Cloudflare Pages, any Node host that can run the Nitro/Vercel output. GitHub Pages is a poor fit (needs a static adapter; this is an SSR-capable TanStack Start app).

Auth/DB stay off. A static-ish deploy is enough because persistence is localStorage.

---

## Android / GitHub status

- **Git:** this workspace is **not** a git repository (`fatal: not a git repository`).
- **GitHub:** this project is **not** pushed. The connected GitHub account (`raphatherealtor`) currently has a different repo (`HighLevel_LandPage`) and no Synaps-X repo.

To publish:

```bash
git init
git add .
git commit -m "Initial commit: Synaps-X editor"
# create an empty GitHub repo, then:
git remote add origin git@github.com:<you>/synaps-x.git
git branch -M main
git push -u origin main
```

Then import that repo in Vercel (framework: Vite / other, build `npm run build`, output handled by the Nitro Vercel preset).

---

## Important file locations

```
src/routes/index.tsx                 # route → NoteShell
src/routes/__root.tsx                # document shell, fonts, theme-color
src/router.tsx                       # getRouter()
src/styles.css                       # design tokens
src/components/editor/NoteShell.tsx  # app chrome + tab switcher + hydrate
src/components/editor/EditorBody.tsx # editor session, drop/paste, caret API
src/components/editor/SemanticBlock.tsx  # block logic (keys, slash, merge/split)
src/components/editor/ImageBlock.tsx # image UI + display-size slider
src/components/editor/NeuralIndex.tsx
src/components/editor/NotesLibrary.tsx
src/components/editor/SettingsPanel.tsx  # settings + markdown download
src/components/editor/Toolbar.tsx
src/components/editor/chrome.tsx     # header, nav, focus chip
src/lib/editor/store.ts              # Zustand store + persist
src/lib/editor/types.ts              # Block / Note / semantic types
src/lib/editor/images.ts             # compress + data URL
src/lib/editor/markdown.ts           # inline render + toMarkdown
src/lib/editor/seed.ts               # demo notes
src/lib/editor/theme.ts              # per-type colors
public/demo/*.jpg                    # seed images
public/favicon.svg
public/og.jpg
src/lib/og/site.json                 # share-card title
vite.config.ts                       # preserve port 8080 + grokPwaPlugin + nitro
package.json
```

Scaffold you can ignore for product work (do not delete if you still deploy from Grok App Builder): `src/lib/auth/`, `src/lib/db.ts`, `src/lib/app-data/`, `src/lib/multiplayer/`, `migrations/auth/`, `server/`, `scripts/grok-pwa-*`, `public/__grok/`, `src/components/preview-host-bridge.tsx`.

`PreviewHostBridge` is a **noop** when the app is not framed by Grok. Safe to leave.

---

## Dependencies that matter

**Product**

- `react` / `react-dom` — UI
- `@tanstack/react-router` + `@tanstack/react-start` — routing/SSR
- `zustand` — editor store + localStorage persist
- `tailwindcss` + `@tailwindcss/vite` — styles
- `lucide-react` — icons
- `clsx` + `tailwind-merge` — `cn()` helper
- `zod` — used by the preview-bridge envelope, not the editor

**Scaffold (unused by the editor, tightly coupled to the Grok sandbox / Vercel template)**

- `better-auth`, `pg`, `@electric-sql/pglite`, `kysely`, `jose` — auth/db, not imported by editor code
- `nitro` — production server preset `vercel`
- Radix, cmdk, recharts, vaul, react-hook-form, sonner, etc. — template UI kit, **not used** by Synaps-X screens

---

## Sandbox-only bits

These work because the app was built inside Grok Build. They do **not** break a local `npm run dev` after download, but they are not product features:

| Item | What happens outside Grok |
|---|---|
| `PreviewHostBridge` | Silent noop |
| `grokPwaPlugin` / `public/__grok` | Manifest + "Created with Grok" pill still inject if those files ship |
| `startup.sh` | Grok revive helper. Locally use `npm run dev` |
| MCP Active chip | Fake. Always on. No MCP client |
| `src/lib/auth`, `src/lib/db` | Dead code unless you opt in |
| User notes in the live preview | **Lost** if you only keep the repo — they live in that origin's localStorage |
| Asset URLs | Demo images are repo-relative `/demo/*.jpg`. Uploaded images are data URLs. Nothing points at a temporary sandbox CDN |

After download you have the **source**. You do not automatically have notes typed in the preview.

---

## Portability

**Source: yes.** `package.json`, lockfile, `src/`, `public/`, Vite/TS config, and this README are enough to run and keep developing elsewhere.

**User data: no, not in the repo.** Export markdown and/or copy localStorage first.

**GitHub: not yet.** Init and push (see above).

---

## Backup checklist before leaving a session

- [ ] Download / zip the project files (source of truth for code)
- [ ] Export any notes you care about via Settings → Export .md
- [ ] Optional: in DevTools → Application → Local Storage, copy `synaps-x-journal`
- [ ] Keep `public/demo/*.jpg` (seed images)
- [ ] Init git, create a GitHub repo, push
- [ ] No env secrets to save
- [ ] Keep this README
- [ ] Optional: screenshots under `screenshots/`
- [ ] Do not rely on the Grok live-preview origin for data after the session ends
