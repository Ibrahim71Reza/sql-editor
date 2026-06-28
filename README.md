<div align="center">

# 🗄️ SQL Studio Pro
**The Ultimate Browser-Based SQL Editor**

[![Next.js](https://img.shields.io/badge/Next.js-black?style=for-the-badge&logo=next.js&logoColor=white)](#)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](#)
[![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](#)
[![Status](https://img.shields.io/badge/Status-Production_Ready-success?style=for-the-badge)](#)

> A simple, Vercel-ready SQL editor that runs completely inside the browser. No backend server, no paid database—just a pure PostgreSQL-style playground powered by WebAssembly.

---
</div>

## ✨ What is SQL Studio Pro?

This application allows users to write, run, and manage SQL databases **directly in their browser**. Because the database runs locally via WebAssembly, it requires zero backend setup. 

**With SQL Studio Pro, you can:**
- 🏗️ **Create & manage** tables and schema.
- 🔍 **Run queries** (`SELECT`, `JOIN`, `GROUP BY`, `ORDER BY`).
- 📊 **View output** in a clean, sortable, and filterable data table.
- 💾 **Save queries** locally and view query history.
- 📥 **Import CSV** data to instantly create tables.
- 📤 **Export data** to CSV or JSON formats.
- 📦 **Backup & Restore** the entire database as a `.tar` file.

---

## 💻 Tech Stack

| Technology | Description |
| :--- | :--- |
| **[Next.js](https://nextjs.org/)** | Frontend framework (App Router). Configured for **static export**, meaning it can be deployed on Vercel's free plan with zero serverless functions. |
| **[Monaco Editor](https://microsoft.github.io/monaco-editor/)** | The code editor engine (same as VS Code). Provides syntax highlighting, line numbers, and a premium typing experience. |
| **[PGlite](https://pglite.dev/)** | The magic behind the app. Runs a real PostgreSQL-compatible database inside the browser using WebAssembly. |
| **IndexedDB** | Native browser storage system used to persist your database across page refreshes. |

> ⚠️ **Important Note on Storage:** The database is stored locally in the user's browser. If you open the app in a different browser or device, it will act as a completely separate database.

---

## 🎨 UI Layout

The interface is designed to be intuitive, clean, and classroom-friendly.

*   **🗂️ Left Panel (Schema):** View tables, columns, data types, and access quick table actions.
*   **⌨️ Center Panel (Editor & Output):** The Monaco SQL editor sits on top. Hit run, and your query results appear directly below in a sleek data table.
*   **👀 Right Panel (Preview):** View previews of available tables to quickly understand your dataset.

---

## 🚀 Key Features

### ⚡ Smart Execution
*   **Run SQL:** Execute the entire editor's contents.
*   **Run Selected:** Highlight a specific snippet of SQL and run *only* that highlighted text.
*   **Multi-statement Support:** Run `CREATE`, `INSERT`, and `SELECT` all at once. The app intelligently displays the output of the final visible table result.

### 💾 Backup & Persistence
*   **Offline-First:** No API required. Data persists across reloads via IndexedDB.
*   **`.tar` Backups:** Export your entire local database as a `.tar` file and import it later to restore your environment on any machine.

---

## 🛠️ Getting Started

### 1. Run Locally

Install dependencies and start the development server:

```bash
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 2. Build for Production

This project is configured for static export. 

```bash
npm run build
```
*The final static output will be generated inside the `out/` directory.*

### 3. Deploy to Vercel ▲

Deploying is incredibly easy and entirely free since there are no serverless functions. Use these settings in your Vercel dashboard:

*   **Build Command:** `npm run build`
*   **Output Directory:** `out`
*   **Install Command:** `npm install`

---

## 📂 Project Structure

```text
📦 sql-studio-pro
 ┣ 📂 app
 ┃ ┣ 📜 favicon.ico
 ┃ ┣ 📜 globals.css
 ┃ ┣ 📜 layout.js
 ┃ ┗ 📜 page.js
 ┣ 📂 components
 ┃ ┣ 📜 DatabaseProvider.js
 ┃ ┣ 📜 SqlEditor.js
 ┃ ┣ 📜 SchemaPanel.js
 ┃ ┣ 📜 OutputTable.js
 ┃ ┗ 📜 ToolsDrawer.js
 ┣ 📂 lib
 ┃ ┣ 📜 dbWorker.js
 ┃ ┗ 📜 helpers.js
 ┗ 📂 public
   ┗ 📂 assets/icons
```

---

## 🧪 Testing & Snippets

Here are some helpful SQL snippets to test your local environment:

<details>
<summary><strong>1. Create & Populate a Table</strong></summary>

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
</details>

<details>
<summary><strong>2. Check all public tables</strong></summary>

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```
</details>

<details>
<summary><strong>3. Wipe the database (Hard Reset)</strong></summary>

```sql
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
```
</details>

<details>
<summary><strong>4. Testing `.tar` Backup & Restore</strong></summary>

1. Create tables and insert data.
2. Click **Export** to save the `.tar` backup.
3. Run the **Hard Reset** SQL (above) to delete everything.
4. Verify tables are gone using the **Check tables** query.
5. Import your `.tar` file.
6. Run the **Check tables** query again—your data should be fully restored!
</details>

---

## 🐛 Troubleshooting

<details>
<summary><strong>App builds successfully but old data still appears</strong></summary>
The app stores data in the browser's IndexedDB. If old data or ghosts of past schemas appear, open your browser's Developer Tools (F12) -> Application -> Storage -> IndexedDB, and clear it.
</details>

<details>
<summary><strong>Do I need a <code>.env.local</code> file?</strong></summary>
No! This version operates 100% offline and requires no authentication (Firebase) or external database URIs. All features work out of the box without environment variables.
</details>

<details>
<summary><strong>Vercel deployment shows a blank screen or old version</strong></summary>
Ensure your Vercel project is set to use <code>out</code> as the Output Directory. Verify that your latest commits are pushed to GitHub before triggering a deploy.
</details>

<details>
<summary><strong><code>npm audit</code> shows warnings</strong></summary>
If the app builds and runs successfully, <strong>do not</strong> immediately run <code>npm audit fix --force</code>. Forcing fixes can upgrade major versions of dependencies (like Monaco or Next.js) and break the project. Review warnings manually.
</details>

---

## ✅ Final Status

This project is complete as an offline-first browser SQL editor. 

- [x] Simple SQL editor UI
- [x] Browser-based database (PGlite)
- [x] Local persistence (IndexedDB)
- [x] SQL output table (Sort/Filter)
- [x] Schema browser & Table previews
- [x] CSV import/export & JSON export
- [x] Saved queries & Query history
- [x] `.tar` backup and restore
- [x] Vercel static deployment support

**SQL Studio Pro is ready for immediate local use and Vercel deployment.** 🎉