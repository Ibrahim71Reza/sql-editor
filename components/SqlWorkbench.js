"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import SqlEditor from "./SqlEditor";
import { useDb } from "./DatabaseProvider";
import {
  APP_KEYS,
  DEFAULT_SQL,
  SNIPPETS,
  compactSql,
  copyText,
  downloadBlob,
  formatSql,
  getLocalJson,
  id,
  quoteIdentifier,
  resultToCsv,
  setLocalJson,
} from "@/lib/sqlUtils";

function getSortableValue(value) {
  if (value === null || value === undefined) return "";
  const number = Number(value);
  return Number.isFinite(number) && String(value).trim() !== "" ? number : String(value).toLowerCase();
}

function useToast() {
  const [toast, setToast] = useState(null);
  const timer = useRef(null);

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(null), 2800);
  }, []);

  useEffect(() => () => window.clearTimeout(timer.current), []);
  return [toast, showToast];
}

function EmptyState({ title = "No output yet", text = "Run SQL to see results here." }) {
  return (
    <div className="empty-output">
      <div className="empty-icon">▦</div>
      <strong>{title}</strong>
      <span>{text}</span>
    </div>
  );
}

function DataTable({ result, title, maxHeight = 420, compact = false, onNotice }) {
  const [filter, setFilter] = useState("");
  const [sort, setSort] = useState({ column: "", direction: "asc" });

  const fields = result?.fields || [];
  const rows = result?.rows || [];

  useEffect(() => {
    setFilter("");
    setSort({ column: "", direction: "asc" });
  }, [result?.id]);

  const visibleRows = useMemo(() => {
    let nextRows = [...rows];
    const term = filter.trim().toLowerCase();

    if (term) {
      nextRows = nextRows.filter((row) => fields.some((field) => String(row[field.name] ?? "").toLowerCase().includes(term)));
    }

    if (sort.column) {
      const direction = sort.direction === "asc" ? 1 : -1;
      nextRows.sort((leftRow, rightRow) => {
        const left = getSortableValue(leftRow[sort.column]);
        const right = getSortableValue(rightRow[sort.column]);
        if (left < right) return -1 * direction;
        if (left > right) return 1 * direction;
        return 0;
      });
    }

    return nextRows;
  }, [rows, fields, filter, sort]);

  const toggleSort = (column) => {
    setSort((current) => {
      if (current.column !== column) return { column, direction: "asc" };
      if (current.direction === "asc") return { column, direction: "desc" };
      return { column: "", direction: "asc" };
    });
  };

  const copyCsv = async () => {
    await copyText(resultToCsv(fields, visibleRows));
    onNotice?.("Copied result as CSV.");
  };

  const exportCsv = () => downloadBlob(resultToCsv(fields, visibleRows), `${title || "sql-result"}-${Date.now()}.csv`, "text/csv;charset=utf-8");
  const exportJson = () => downloadBlob(JSON.stringify(visibleRows, null, 2), `${title || "sql-result"}-${Date.now()}.json`, "application/json;charset=utf-8");

  if (!result) return <EmptyState />;

  if (!fields.length) {
    return (
      <div className="success-output">
        <div className="success-mark">✓</div>
        <strong>Statement executed successfully</strong>
        <span>{result.elapsedMs ?? 0}ms{result.affectedRows !== null && result.affectedRows !== undefined ? ` · affected rows: ${result.affectedRows}` : ""}</span>
      </div>
    );
  }

  return (
    <div className={compact ? "data-block compact" : "data-block"}>
      {!compact && (
        <div className="output-toolbar">
          <div>
            <strong>{title || "Output"}</strong>
            <span>{visibleRows.length.toLocaleString()} rows · {fields.length} columns · {result.elapsedMs ?? 0}ms</span>
          </div>
          <input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Filter output..." />
          <button onClick={copyCsv}>Copy CSV</button>
          <button onClick={exportCsv}>CSV</button>
          <button onClick={exportJson}>JSON</button>
        </div>
      )}
      <div className="table-scroll" style={{ maxHeight }}>
        <table className="simple-table">
          <thead>
            <tr>
              {fields.map((field) => (
                <th key={field.name} onClick={() => toggleSort(field.name)}>
                  {field.name}{sort.column === field.name ? (sort.direction === "asc" ? " ↑" : " ↓") : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row, rowIndex) => (
              <tr key={`${result.id}-${rowIndex}`}>
                {fields.map((field) => {
                  const value = row[field.name];
                  return <td key={field.name} className={value === null ? "null-value" : ""}>{value === null ? "NULL" : String(value)}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
        {!visibleRows.length && <div className="small-empty">No rows found.</div>}
      </div>
    </div>
  );
}

function SchemaTree({ schema, status, initError, onPreview, onCount, onDescribe, onInsert }) {
  const tableCount = schema.length;
  const columnCount = schema.reduce((sum, table) => sum + table.columns.length, 0);

  return (
    <aside className="left-panel">
      <div className="panel-title-row">
        <h2>Schema</h2>
        <span>{status}</span>
      </div>

      <div className="mini-stats">
        <div><span>Tables</span><strong>{tableCount}</strong></div>
        <div><span>Columns</span><strong>{columnCount}</strong></div>
      </div>

      {initError && <div className="error-card">{initError}</div>}

      <div className="schema-tree">
        {schema.map((table) => (
          <details key={table.tableName} className="schema-node" open>
            <summary>
              <span className="table-icon">▣</span>
              <strong>{table.tableName}</strong>
              <em>{table.columns.length} cols</em>
            </summary>
            <div className="schema-actions">
              <button onClick={() => onPreview(table.tableName)}>Preview</button>
              <button onClick={() => onCount(table.tableName)}>Count</button>
              <button onClick={() => onDescribe(table.tableName)}>Describe</button>
              <button onClick={() => onInsert(table.tableName)}>Insert</button>
            </div>
            <div className="column-tree">
              {table.columns.map((column) => (
                <div key={`${table.tableName}-${column.column_name}`} className="column-row">
                  <span>{column.column_name}</span>
                  <b>[{column.data_type}]</b>
                </div>
              ))}
            </div>
          </details>
        ))}
        {!schema.length && <div className="small-empty">No public tables found.</div>}
      </div>
    </aside>
  );
}

function RightTablePreview({ previews, schema, loading, onRefresh, onPreview }) {
  return (
    <aside className="right-panel">
      <div className="panel-title-row">
        <h2>Available Tables</h2>
        <button onClick={onRefresh} disabled={loading}>{loading ? "Loading..." : "Refresh"}</button>
      </div>
      <div className="preview-list">
        {schema.map((table) => {
          const preview = previews[table.tableName];
          return (
            <section className="preview-card" key={table.tableName}>
              <div className="preview-title">
                <h3>{table.tableName}</h3>
                <button onClick={() => onPreview(table.tableName)}>Open</button>
              </div>
              {preview?.error ? <div className="error-card small">{preview.error}</div> : <DataTable result={preview} compact maxHeight={220} />}
            </section>
          );
        })}
      </div>
    </aside>
  );
}

function Drawer({ title, open, onClose, children }) {
  if (!open) return null;
  return (
    <div className="drawer-backdrop" onMouseDown={onClose}>
      <section className="drawer" onMouseDown={(event) => event.stopPropagation()}>
        <header>
          <h2>{title}</h2>
          <button onClick={onClose}>×</button>
        </header>
        {children}
      </section>
    </div>
  );
}

export default function SqlWorkbench() {
  const { db, isReady, status, initError, schema, execSql, refreshSchema, exportDb, importDb, resetDb, importCsvFile, quickSql } = useDb();
  const [theme, setTheme] = useState("light");
  const [sql, setSql] = useState(DEFAULT_SQL);
  const [selectedSql, setSelectedSql] = useState("");
  const [results, setResults] = useState([]);
  const [activeResultIndex, setActiveResultIndex] = useState(0);
  const [error, setError] = useState("");
  const [running, setRunning] = useState(false);
  const [saved, setSaved] = useState([]);
  const [history, setHistory] = useState([]);
  const [drawer, setDrawer] = useState("");
  const [previews, setPreviews] = useState({});
  const [previewLoading, setPreviewLoading] = useState(false);
  const [toast, showToast] = useToast();
  const editorRef = useRef(null);
  const dbFileRef = useRef(null);
  const csvFileRef = useRef(null);

  const activeResult = results[activeResultIndex] || null;

  useEffect(() => {
    setTheme(getLocalJson(APP_KEYS.theme, "light"));
    setSql(getLocalJson(`${APP_KEYS.tabs}:simple-sql`, DEFAULT_SQL));
    setSaved(getLocalJson(APP_KEYS.saved, []));
    setHistory(getLocalJson(APP_KEYS.history, []));
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    setLocalJson(APP_KEYS.theme, theme);
  }, [theme]);

  useEffect(() => setLocalJson(`${APP_KEYS.tabs}:simple-sql`, sql), [sql]);
  useEffect(() => setLocalJson(APP_KEYS.saved, saved), [saved]);
  useEffect(() => setLocalJson(APP_KEYS.history, history), [history]);

  const chooseBestResultIndex = (resultList) => {
    const lastTableIndex = [...resultList].map((result, index) => ({ result, index })).reverse().find((item) => item.result.fields?.length)?.index;
    return typeof lastTableIndex === "number" ? lastTableIndex : Math.max(0, resultList.length - 1);
  };

  const runRawSql = useCallback(async (sqlToRun, options = {}) => {
    if (!isReady || running) return;
    const cleanSql = String(sqlToRun || "").trim();
    if (!cleanSql) {
      showToast("Write SQL first.", "error");
      return;
    }

    setRunning(true);
    setError("");

    try {
      const started = performance.now();
      const nextResults = await execSql(cleanSql);
      const elapsedMs = Math.round(performance.now() - started);
      const normalized = nextResults.map((result, index) => ({
        ...result,
        title: result.fields?.length ? `Result ${index + 1}` : `Statement ${index + 1}`,
      }));

      setResults(normalized);
      setActiveResultIndex(chooseBestResultIndex(normalized));
      setHistory((current) => [{ id: id(), sql: cleanSql, ok: true, elapsedMs, at: new Date().toISOString() }, ...current].slice(0, 80));
      showToast(options.message || `Executed successfully in ${elapsedMs}ms.`);
      await refreshPreviews(false);
    } catch (err) {
      const message = err?.message || "SQL execution failed.";
      setError(message);
      setHistory((current) => [{ id: id(), sql: cleanSql, ok: false, error: message, at: new Date().toISOString() }, ...current].slice(0, 80));
      showToast("SQL failed. Check output error.", "error");
    } finally {
      setRunning(false);
    }
  // refreshPreviews is intentionally not in the dependency list because it calls run-independent execSql internally.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, running, execSql, showToast]);

  const getSelection = useCallback(() => {
    const editor = editorRef.current;
    const model = editor?.getModel?.();
    const selection = editor?.getSelection?.();
    return model && selection ? model.getValueInRange(selection).trim() : "";
  }, []);

  const runSql = (mode = "all") => {
    const sqlToRun = mode === "selection" ? getSelection() || sql : sql;
    void runRawSql(sqlToRun, { message: mode === "selection" ? "Selected SQL executed." : "SQL executed." });
  };

  const loadAndRun = (nextSql, message) => {
    setSql(nextSql);
    void runRawSql(nextSql, { message });
  };

  const refreshPreviews = useCallback(async (withToast = true) => {
    if (!isReady || !db || !schema.length) return;
    setPreviewLoading(true);
    const nextPreviews = {};
    for (const table of schema) {
      try {
        const started = performance.now();
        const resultList = await db.exec(`SELECT * FROM ${quoteIdentifier(table.tableName)} LIMIT 10;`);
        const elapsedMs = Math.round(performance.now() - started);
        const normalized = (Array.isArray(resultList) ? resultList : []).map((item, index) => ({
          id: `preview-${table.tableName}-${Date.now()}-${index}`,
          title: `Preview ${table.tableName}`,
          fields: item?.fields || [],
          rows: item?.rows || [],
          affectedRows: item?.affectedRows ?? item?.affectedRowCount ?? null,
          elapsedMs,
        }));
        nextPreviews[table.tableName] = normalized.find((result) => result.fields?.length) || normalized[0] || null;
      } catch (err) {
        nextPreviews[table.tableName] = { error: err?.message || "Unable to preview table." };
      }
    }
    setPreviews(nextPreviews);
    setPreviewLoading(false);
    if (withToast) showToast("Table previews refreshed.");
  }, [isReady, db, schema, showToast]);

  useEffect(() => {
    if (isReady && schema.length) void refreshPreviews(false);
  }, [isReady, schema.length, refreshPreviews]);

  const saveCurrent = () => {
    if (!sql.trim()) return showToast("No SQL to save.", "error");
    const name = prompt("Save query as:", "My SQL query");
    if (!name) return;
    setSaved((current) => [{ id: id(), name: name.trim(), sql, at: new Date().toISOString() }, ...current].slice(0, 80));
    showToast("Query saved locally.");
  };

  const importDatabase = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!confirm("This will replace your current local database. Continue?")) return;
    try {
      await importDb(file);
      showToast("Database imported.");
      await refreshSchema();
      await refreshPreviews(false);
    } catch (err) {
      showToast(err?.message || "Import failed.", "error");
    }
  };

  const importCsv = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const requestedName = prompt("Table name for this CSV:", file.name.replace(/\.[^.]+$/, ""));
    if (!requestedName) return;
    try {
      const imported = await importCsvFile(file, requestedName);
      showToast(`Imported ${imported.rowCount} rows into ${imported.tableName}.`);
      await refreshSchema();
      await refreshPreviews(false);
    } catch (err) {
      showToast(err?.message || "CSV import failed.", "error");
    }
  };

  const resetDatabase = async () => {
    if (!confirm("Reset the local database and restore demo tables?")) return;
    await resetDb();
    setResults([]);
    showToast("Demo database restored.");
  };

  return (
    <div className="simple-app">
      <header className="simple-topbar">
        <div className="brand-simple">
          <div className="brand-badge">SQL</div>
          <div>
            <h1>SQL Studio Pro</h1>
            <p>Simple browser SQL editor · PGlite local database · Vercel ready</p>
          </div>
        </div>
        <nav className="top-buttons">
          <button onClick={() => setDrawer("saved")}>Saved</button>
          <button onClick={() => setDrawer("history")}>History</button>
          <button onClick={() => setDrawer("tools")}>Tools</button>
          <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>{theme === "dark" ? "Light" : "Dark"}</button>
          <button onClick={() => refreshSchema().then(() => refreshPreviews()).then(() => showToast("Schema refreshed."))}>Refresh</button>
          <button className="primary" onClick={() => runSql("all")} disabled={!isReady || running}>{running ? "Running..." : "Run SQL ▶"}</button>
        </nav>
      </header>

      {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}

      <main className="three-column-layout">
        <SchemaTree
          schema={schema}
          status={status}
          initError={initError}
          onPreview={(table) => loadAndRun(quickSql.preview(table), `Previewed ${table}.`)}
          onCount={(table) => loadAndRun(quickSql.count(table), `Counted ${table}.`)}
          onDescribe={(table) => loadAndRun(quickSql.describe(table), `Described ${table}.`)}
          onInsert={(table) => setSql((current) => `${current.trim()}\n\n${quickSql.insertTemplate(table)}`)}
        />

        <section className="center-panel">
          <div className="input-header">
            <h2>Input</h2>
            <div>
              <button onClick={() => setSql(formatSql(sql))}>Format</button>
              <button onClick={() => runSql("selection")} disabled={!isReady || running}>Run Selected</button>
              <button className="primary" onClick={() => runSql("all")} disabled={!isReady || running}>Run SQL</button>
            </div>
          </div>
          <div className="editor-box">
            <SqlEditor
              value={sql}
              onChange={setSql}
              theme={theme}
              editorRef={editorRef}
              onRun={runSql}
              onSelectionChange={setSelectedSql}
            />
          </div>

          <section className="output-panel">
            <div className="output-header">
              <div>
                <h2>Output</h2>
                <p>{selectedSql.trim() ? "Selection active. Run Selected will execute highlighted SQL only." : "Run SQL executes the full editor."}</p>
              </div>
              <div className="result-tabs-simple">
                {results.map((result, index) => (
                  <button key={result.id} className={index === activeResultIndex ? "active" : ""} onClick={() => setActiveResultIndex(index)}>
                    {result.title}{result.rows?.length ? ` (${result.rows.length})` : ""}
                  </button>
                ))}
              </div>
            </div>
            {error && <div className="error-output"><strong>SQL Error</strong><span>{error}</span></div>}
            {!error && <DataTable result={activeResult} title={activeResult?.title || "Output"} onNotice={showToast} />}
          </section>
        </section>

        <RightTablePreview previews={previews} schema={schema} loading={previewLoading} onRefresh={() => refreshPreviews()} onPreview={(table) => loadAndRun(quickSql.preview(table), `Previewed ${table}.`)} />
      </main>

      <Drawer title="Saved Queries" open={drawer === "saved"} onClose={() => setDrawer("")}>
        <button className="wide primary" onClick={saveCurrent}>Save current query</button>
        <div className="drawer-list">
          {saved.map((item) => (
            <div className="drawer-card" key={item.id}>
              <button onClick={() => { setSql(item.sql); setDrawer(""); }}>
                <strong>{item.name}</strong>
                <span>{compactSql(item.sql)}</span>
              </button>
              <button className="danger" onClick={() => setSaved((current) => current.filter((query) => query.id !== item.id))}>Delete</button>
            </div>
          ))}
          {!saved.length && <div className="small-empty">No saved queries.</div>}
        </div>
      </Drawer>

      <Drawer title="Query History" open={drawer === "history"} onClose={() => setDrawer("")}>
        <button className="wide" onClick={() => setHistory([])}>Clear history</button>
        <div className="drawer-list">
          {history.map((item) => (
            <button className={item.ok ? "history-item ok" : "history-item bad"} key={item.id} onClick={() => { setSql(item.sql); setDrawer(""); }}>
              <strong>{item.ok ? "Success" : "Failed"}{item.elapsedMs ? ` · ${item.elapsedMs}ms` : ""}</strong>
              <span>{compactSql(item.sql)}</span>
              {item.error && <em>{item.error}</em>}
            </button>
          ))}
          {!history.length && <div className="small-empty">No history yet.</div>}
        </div>
      </Drawer>

      <Drawer title="Tools" open={drawer === "tools"} onClose={() => setDrawer("")}>
        <div className="tools-grid">
          <button onClick={exportDb} disabled={!isReady}>Export Database .tar</button>
          <button onClick={() => dbFileRef.current?.click()}>Import Database .tar</button>
          <button onClick={() => csvFileRef.current?.click()}>Import CSV as Table</button>
          <button onClick={resetDatabase} className="danger">Reset Demo Database</button>
        </div>
        <input ref={dbFileRef} hidden type="file" accept=".tar,application/x-tar" onChange={importDatabase} />
        <input ref={csvFileRef} hidden type="file" accept=".csv,text/csv" onChange={importCsv} />
        <h3>SQL Snippets</h3>
        <div className="snippet-grid">
          {SNIPPETS.map((snippet) => <button key={snippet.name} onClick={() => setSql((current) => `${current.trim()}\n\n${snippet.sql}`)}>{snippet.name}</button>)}
        </div>
      </Drawer>
    </div>
  );
}
