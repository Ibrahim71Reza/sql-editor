# SQL Studio Pro

SQL Studio Pro is an offline-first SQL practice workbench that runs entirely in the browser. It uses PGlite, a WebAssembly PostgreSQL-compatible database, so you can create tables, run queries, import CSV files, and back up your work without a backend server or cloud account.

## What It Does

- Run PostgreSQL-style SQL in the browser.
- Practice with seeded demo tables for employees, customers, orders, and order items.
- Browse schema, columns, table previews, and quick table actions.
- Run the whole editor or only the selected SQL.
- View query results in a sortable, filterable table.
- Copy results as CSV or export results as CSV/JSON.
- Save queries and query history locally in the browser.
- Import CSV files as tables.
- Export and restore the full local database as a `.tar` backup.
- Deploy as a static Vercel site with no serverless functions.

## Offline-Only Design

This project intentionally does not use cloud sync, login, external databases, or server APIs. Database state lives in the browser through IndexedDB. Saved queries and preferences live in localStorage.

Because storage is local to the browser, another browser, device, or cleared browser profile will have a separate database.

## Tech Stack

- Next.js App Router with static export
- React
- Monaco Editor
- PGlite in a Web Worker
- IndexedDB and localStorage

## Getting Started

Install dependencies:

```bash
npm install
```

Run locally:

```bash
npm run dev
```

Open `http://localhost:3000`.

Build the static site:

```bash
npm run build
```

The static export is written to `out/`.

Run utility tests:

```bash
npm test
```

## Deploying To Vercel

The project is configured for Vercel static deployment.

Recommended settings:

- Install command: `npm ci --no-audit --no-fund`
- Build command: `npm run build`
- Output directory: `out`

These are already set in `vercel.json`.

## Project Structure

```text
app/
  globals.css
  layout.js
  page.js
components/
  DatabaseProvider.js
  Providers.js
  SqlEditor.js
  SqlWorkbench.js
lib/
  dbWorker.js
  sqlUtils.js
tests/
  sqlUtils.test.js
```

## Backup And Restore

Use the Tools drawer to export the current browser database as a `.tar` file. Importing a backup replaces the current local database with the backup contents.

Restores are pure restores: demo seed tables are not automatically added after importing a backup. The demo database is only seeded on first empty startup or when using "Reset Demo Database".

## CSV Import

CSV imports create text columns from the header row. If the target table already exists, the app asks whether to replace the table or append rows.

## Useful SQL Snippets

Create a practice table:

```sql
CREATE TABLE IF NOT EXISTS notes (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT,
  created_at TIMESTAMP DEFAULT now()
);

INSERT INTO notes (title, body)
VALUES ('First note', 'Created from SQL Studio Pro');

SELECT * FROM notes ORDER BY id DESC;
```

List public tables:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

Reset manually:

```sql
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
```

## Troubleshooting

If old tables still appear, clear the browser's IndexedDB data for this site.

No `.env.local` file is required. The app is designed to work offline with no environment variables.

If Vercel install fails, make sure the committed `package-lock.json` uses public `registry.npmjs.org` tarball URLs and that Vercel is using the install command from `vercel.json`.
