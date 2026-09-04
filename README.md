# Synaps-X Editor

A phone-first, local-first semantic journal: notes, linked blocks, checklists, images, captions, a neural index, and Markdown export. Built with React 19, TanStack Start, Vite, Tailwind and Zustand. This is a web app, not an APK or native iOS app.

Repository: https://github.com/raphatherealtor/synaps-x-editor

## Run locally

Use Node 22.23+ or Node 24 and npm. The lockfile is authoritative.

```sh
npm ci
npm run dev
npm run typecheck
npm test
npm run build
```

The scripts work on Windows and Unix. Development uses port 8080 by default; use an unused port when another project is running. Build produces Nitro's Vercel output in `.vercel/output`. It does not run database migrations. No API keys or database are required. Auth is off; do not enable the unused scaffold without implementing its product flows.

`npm test` runs the portable application tests, including editor operations, backup validation, transaction completion and storage failure/retry. `npm run test:scaffold` separately runs the original Grok build-environment tests; those are not the portable product acceptance suite. `npm run lint` checks the entire imported scaffold as well as the product.

## Beta reliability

- Notes/settings are saved to localStorage; uploaded image blobs are saved to IndexedDB.
- The save indicator acknowledges the actual localStorage write. Failed writes remain pending and show **Not saved**. Export a backup before closing when storage is full.
- Image writes wait for the IndexedDB transaction to commit.
- Editing waits for hydration and legacy image migration.
- A Web Lock permits one editing tab per origin, preventing stale tabs from overwriting each other. Close the other tab and reload to switch tabs. A modern browser and HTTPS (or localhost during development) are required.
- Mobile navigation stays outside scrolling content. Browser zoom is allowed.
- **Local / Device only** means exactly that: no cloud sync, MCP connection or cross-device service.

## Full backup and transfer

In **Settings → Download full backup**, save the `.synaps.json` file. It includes all notes, block links, settings, and referenced image binaries, including demo images. Export stops if an image cannot be found rather than silently producing an incomplete backup.

In **Settings → Import backup**, choose that file. Restore is additive: existing notes are retained and imported notes/images receive new IDs. Repeated imports create additional copies. Settings from the backup are restored, except focus mode. Invalid files are rejected; a failed restore rolls back imported notes and attempts to remove newly written image blobs.

The beta backup file limit is **96 MB**. Backups are **not encrypted**; store them privately. **Export .md** is a text interchange option, not a complete image backup.

Browser storage is tied to the exact origin and browser profile. Localhost, a Grok preview, a preview deployment and a production domain have separate journals. Export before changing origins; import on the destination. The repository never contains notes typed into the app. Clearing website data, private browsing, storage eviction or losing the device can lose the journal. Keep regular external backups.

## Phone use and deployment

The build uses Nitro's Vercel preset. Deploy this repository as a separate project with `npm run build`, then use one stable HTTPS production URL on the phone. Notes remain in that phone's browser, not on the hosting server. Hosting the code does not transfer an existing journal.

The app has its own `/manifest.webmanifest` and Apple web-app metadata. It can be opened in a mobile browser and added to the home screen where supported. There is **no service worker or offline launch cache**; an internet connection is required to load the app. Home-screen installation, the physical mobile keyboard, photo selection, and downloading/restoring backups still need acceptance testing on the target phone. Desktop browser checks are not a substitute.

## Known beta limits

- No automatic multi-device sync, accounts, native wrapper or app-store package.
- JPEG/PNG/WebP/GIF uploads are compressed to JPEG, maximum edge 1400px; transparency and animation are flattened. HEIC is not supported.
- Image display resizing does not alter the source. The UI crops images visually.
- Unreferenced image blobs are deliberately retained to protect undo and in-flight operations. Repeated replacement/deletion consumes storage; automatic garbage collection is deferred.
- Local save and image storage are separate browser stores, not a cross-store atomic database. Full backups are the recovery mechanism.
- No claim of complete offline support or physical-phone certification.

## Key files

- `src/components/editor/NoteShell.tsx`: hydration, single-tab guard and mobile shell.
- `src/components/editor/SettingsPanel.tsx`: backup/restore and settings.
- `src/lib/editor/store.ts`: note/block operations and persisted state.
- `src/lib/editor/persist-storage.ts`: debounced save acknowledgement and retry.
- `src/lib/editor/image-db.ts`: IndexedDB image assets.
- `src/lib/editor/backup.ts`, `backup-schema.ts`: portable export/import.
- `src/lib/editor/reliability.test.ts`: storage and backup regression tests.
- `public/demo/`: seeded example images.

The imported auth, database, multiplayer and Grok preview integration are scaffold, not implemented Synaps-X product features. Sandbox/session files, `node_modules`, local environments and generated deployment output are excluded by `.gitignore`.
