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
- Optional Firebase modules exist, but the cloud panel is not wired into the current UI

## Runtime Flow

- `app/layout.js` wraps the app in `components/Providers.js`.
- `components/Providers.js` mounts `DatabaseProvider`.
- `app/page.js` renders `components/SqlWorkbench.js`.
- `DatabaseProvider` creates a PGlite worker from `lib/dbWorker.js`, persists data under `idb://sql-studio-pro-local`, seeds demo tables, exposes query/import/export/reset helpers, and keeps public schema state.
- `SqlWorkbench` owns the visible UI: schema panel, Monaco SQL editor, output table, table previews, saved queries, history, tools drawer, import/export actions, and theme state.
- `SqlEditor` wraps Monaco and registers SQL completions plus keyboard shortcuts.
- `lib/sqlUtils.js` contains SQL helpers, CSV parsing/import SQL generation, localStorage helpers, export helpers, and some currently unused utilities from an earlier richer UI.

## Main Files

- `components/DatabaseProvider.js`: PGlite lifecycle, seed SQL, schema read, SQL execution, database import/export/reset, CSV import.
- `components/SqlWorkbench.js`: main client UI and user workflows.
- `components/SqlEditor.js`: Monaco wrapper.
- `lib/sqlUtils.js`: shared SQL, CSV, localStorage, download, formatting helpers.
- `lib/dbWorker.js`: PGlite worker bootstrap.
- `components/CloudPanel.js`: optional Firebase query library component, currently unused.
- `next.config.mjs`: static export config and client-side fallback config.

## Current Health

- Git working tree was clean before analysis.
- Build passes.
- Static export is configured through both `next.config.mjs` and `vercel.json`.
- No test script or lint script is defined in `package.json`.
- The README includes features and project structure from a previous shape of the app; some listed files do not exist anymore.

## Important Notes

- `DatabaseProvider` always executes `SEED_SQL` during initialization. That means importing/restoring a `.tar` backup also ensures demo tables exist. If pure restore semantics are required, seed only on first empty boot or during explicit reset.
- `CloudPanel.js` and `lib/firebase.js` are not connected to the current UI, despite Firebase being in dependencies. Decide whether cloud saving is a future feature or remove the dead path.
- `lib/sqlUtils.js` exports unused items such as `STARTER_TABS`, `buildSqlInsights`, `profileRows`, and `inferChart`. These can be restored into UI features or removed.
- Result rendering assumes unique column names. Queries returning duplicate aliases can collapse values because rows are read by field name.
- CSV import creates all columns as `TEXT` and uses `CREATE TABLE IF NOT EXISTS`; repeated imports into the same table can append duplicate data.
- `reactStrictMode` is disabled, likely to avoid duplicate worker initialization during development.

## Good Next Tasks

1. Decide whether database restore should be pure restore or restore plus demo seed.
2. Add a small smoke-test script for `parseCsv`, `buildImportSql`, `safeTableName`, and `resultToCsv`.
3. Either wire `CloudPanel` into the Tools/Saved drawer or remove Firebase dependencies and cloud code.
4. Refresh README project structure and feature list to match the current source.
5. Consider handling duplicate result column names in `DataTable`.
6. Add an ESLint/test script if this project will keep growing.
