# Project Analysis

Date: 2026-06-30

## Snapshot

SQL Studio Pro is a Next.js App Router project configured for static export. The app is an offline-first browser SQL workbench powered by PGlite running in a Web Worker with IndexedDB persistence. It has no backend routes.

Verified command:

```bash
npm run build
```

Result: successful Next.js production build and static export to `out/`.

## Stack

- Next.js 15.4.10
- React 19.1.2
- Monaco editor via `@monaco-editor/react`
- PGlite via `@electric-sql/pglite`
- No cloud/auth dependency path; the project is intentionally offline-only

## Runtime Flow

- `app/layout.js` wraps the app in `components/Providers.js`.
- `components/Providers.js` mounts `DatabaseProvider`.
- `app/page.js` renders `components/SqlWorkbench.js`.
- `DatabaseProvider` creates a PGlite worker from `lib/dbWorker.js`, persists data under `idb://sql-studio-pro-local`, seeds demo tables only on first empty boot or explicit reset, exposes query/import/export/reset helpers, and keeps public schema state.
- `SqlWorkbench` owns the visible UI: schema panel, Monaco SQL editor, output table, table previews, saved queries, history, tools drawer, import/export actions, and theme state.
- `SqlEditor` wraps Monaco and registers SQL completions plus keyboard shortcuts.
- `lib/sqlUtils.js` contains SQL helpers, CSV parsing/import SQL generation, localStorage helpers, export helpers, and result profiling helpers.

## Main Files

- `components/DatabaseProvider.js`: PGlite lifecycle, seed SQL, schema read, SQL execution, database import/export/reset, CSV import.
- `components/SqlWorkbench.js`: main client UI and user workflows.
- `components/SqlEditor.js`: Monaco wrapper.
- `lib/sqlUtils.js`: shared SQL, CSV, localStorage, download, formatting helpers.
- `lib/dbWorker.js`: PGlite worker bootstrap.
- `next.config.mjs`: static export config and client-side fallback config.
- `tests/sqlUtils.test.js`: Node test coverage for core SQL/CSV helpers.

## Current Health

- Git working tree was clean before analysis.
- Build passes.
- Static export is configured through both `next.config.mjs` and `vercel.json`.
- A lightweight `npm test` script covers core offline utility behavior.
- The README has been refreshed for the offline-only app shape.

## Important Notes

- `.tar` restore is now intended to be a pure restore. `DatabaseProvider` marks restored databases in localStorage and skips demo seeding on import and subsequent reloads.
- `lib/sqlUtils.js` exports unused items such as `STARTER_TABS`, `buildSqlInsights`, `profileRows`, and `inferChart`. These can be restored into UI features or removed.
- SQL execution uses PGlite array row mode so duplicate result column names can render and export accurately.
- CSV import creates all columns as `TEXT`. Existing target tables can now be replaced or appended to from the import flow.
- `reactStrictMode` is disabled, likely to avoid duplicate worker initialization during development.

## Good Next Tasks

1. Consider exposing result profiling/chart helpers in the UI or remove them.
2. Add an ESLint script if this project will keep growing.
3. Consider smarter CSV type inference for numeric/date columns.
4. Add a browser smoke test for backup/restore and CSV import workflows.
