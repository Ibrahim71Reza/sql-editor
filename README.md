# SQL Studio Pro — Simple Final UI

A Vercel-ready browser SQL editor built with Next.js, Monaco Editor, and PGlite.

## What changed in this simple final version

The UI is now intentionally simple and classroom-style:

- Left side: database schema tree with tables and columns.
- Center: SQL input editor and output table directly below it.
- Right side: available table previews.
- `Run SQL` runs the full editor.
- `Run Selected` runs only highlighted SQL.
- Multi-statement SQL automatically opens the last result table, so `CREATE + INSERT + SELECT` shows the `SELECT` table output.
- Output supports filter, sort, copy CSV, CSV export, and JSON export.
- Tools drawer includes DB export/import, CSV import, snippets, and reset demo database.
- Saved queries and query history are local-browser features.

## Run locally

```bash
npm install
npm run dev
```

## Build for Vercel

```bash
npm run build
```

This project uses static export:

- no API routes
- no serverless functions
- no paid database required
- database runs in the browser through PGlite + IndexedDB

## Vercel settings

- Build Command: `npm run build`
- Output Directory: `out`
- Install Command: `npm install`

## Optional Firebase

Firebase is optional. The SQL editor works without `.env.local`.

To enable cloud query saving, create `.env.local` locally and add the same keys in Vercel Environment Variables.
