"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { PGliteWorker } from "@electric-sql/pglite/worker";
import { downloadBlob, quoteIdentifier, safeTableName, parseCsv, buildImportSql } from "@/lib/sqlUtils";

const DbContext = createContext(null);
const IDB_NAME = "sql-studio-pro-local";
const DB_STATE_KEY = "sql-studio-pro-local:state";

const SEED_SQL = `
CREATE TABLE IF NOT EXISTS employees (
  id SERIAL PRIMARY KEY,
  full_name TEXT NOT NULL,
  department TEXT NOT NULL,
  salary INTEGER NOT NULL,
  hired_at DATE NOT NULL,
  city TEXT NOT NULL
);

INSERT INTO employees (id, full_name, department, salary, hired_at, city) VALUES
  (1, 'Aisha Rahman', 'Engineering', 98000, '2021-04-10', 'Dhaka'),
  (2, 'Tanvir Ahmed', 'Analytics', 87000, '2020-02-14', 'Chittagong'),
  (3, 'Sara Khan', 'Product', 91000, '2022-06-01', 'Sylhet'),
  (4, 'Nadia Islam', 'Engineering', 112000, '2019-11-20', 'Dhaka'),
  (5, 'Rehan Chowdhury', 'Sales', 76000, '2023-01-09', 'Khulna'),
  (6, 'Maya Sen', 'Analytics', 94000, '2021-09-18', 'Rajshahi'),
  (7, 'Arif Hossain', 'Support', 61000, '2022-10-04', 'Dhaka'),
  (8, 'Lamia Akter', 'Sales', 83000, '2020-07-25', 'Barishal')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  segment TEXT NOT NULL,
  country TEXT NOT NULL,
  created_at DATE NOT NULL
);

INSERT INTO customers (id, name, segment, country, created_at) VALUES
  (1, 'Northwind Retail', 'Enterprise', 'Bangladesh', '2021-01-12'),
  (2, 'Metro Foods', 'SMB', 'Malaysia', '2021-05-23'),
  (3, 'Blue Ocean Traders', 'Enterprise', 'Singapore', '2022-03-14'),
  (4, 'Green Mart', 'SMB', 'Bangladesh', '2022-08-08'),
  (5, 'Apex Supplies', 'Mid Market', 'Indonesia', '2023-02-11')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  ordered_at DATE NOT NULL,
  status TEXT NOT NULL
);

INSERT INTO orders (id, customer_id, ordered_at, status) VALUES
  (1, 1, '2024-01-15', 'paid'),
  (2, 2, '2024-02-07', 'paid'),
  (3, 1, '2024-02-20', 'shipped'),
  (4, 3, '2024-03-04', 'paid'),
  (5, 4, '2024-03-18', 'pending'),
  (6, 5, '2024-04-02', 'paid'),
  (7, 2, '2024-04-18', 'cancelled'),
  (8, 3, '2024-05-12', 'paid')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id),
  product TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price NUMERIC(10,2) NOT NULL
);

INSERT INTO order_items (id, order_id, product, quantity, unit_price) VALUES
  (1, 1, 'Notebook', 12, 14.50),
  (2, 1, 'Keyboard', 4, 49.90),
  (3, 2, 'Mouse', 20, 19.99),
  (4, 3, 'Monitor', 5, 210.00),
  (5, 4, 'Laptop Stand', 18, 32.00),
  (6, 5, 'USB-C Hub', 9, 74.00),
  (7, 6, 'Headset', 11, 88.50),
  (8, 7, 'Webcam', 3, 120.00),
  (9, 8, 'Desk Lamp', 17, 27.50),
  (10, 8, 'Chair', 2, 185.00)
ON CONFLICT (id) DO NOTHING;
`;

function deleteIndexedDbDatabase(name) {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") return resolve();
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error || new Error("Unable to delete local database."));
    request.onblocked = () => reject(new Error("Close other tabs using this app, then try again."));
  });
}

function getDatabaseState() {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(DB_STATE_KEY);
  } catch {
    return null;
  }
}

function setDatabaseState(state) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DB_STATE_KEY, state);
  } catch {
    // LocalStorage can be disabled in private browsing; the database still works.
  }
}

async function closeDatabaseQuietly(database) {
  if (!database) return;
  try {
    await database.close();
  } catch (error) {
    const message = String(error?.message || error || "");
    // PGlite can throw this during Next dev hot reload / React dev remount.
    // It is safe to suppress because the worker is already closed.
    if (!message.includes("BroadcastChannel") && !message.includes("Channel is closed")) {
      console.warn("Database worker close failed:", error);
    }
  }
}

function normalizeExecResults(results, elapsedMs) {
  const resultArray = Array.isArray(results) ? results : [];
  return resultArray.map((item, index) => ({
    id: `result-${Date.now()}-${index}`,
    title: item?.fields?.length ? `Result ${index + 1}` : `Statement ${index + 1}`,
    fields: item?.fields || [],
    rows: item?.rows || [],
    affectedRows: item?.affectedRows ?? item?.affectedRowCount ?? null,
    elapsedMs,
  }));
}

async function readPublicSchema(database) {
  if (!database) return [];
  const schemaSql = `
    SELECT
      c.table_name,
      c.column_name,
      c.data_type,
      c.is_nullable,
      c.column_default,
      c.ordinal_position
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_schema = c.table_schema
     AND t.table_name = c.table_name
    WHERE c.table_schema = 'public'
      AND t.table_type = 'BASE TABLE'
    ORDER BY c.table_name, c.ordinal_position;
  `;

  const res = await database.exec(schemaSql);
  const rows = res?.[0]?.rows || [];
  const grouped = new Map();

  for (const row of rows) {
    if (!grouped.has(row.table_name)) grouped.set(row.table_name, []);
    grouped.get(row.table_name).push(row);
  }

  return Array.from(grouped.entries()).map(([tableName, columns]) => ({ tableName, columns }));
}

export function DatabaseProvider({ children }) {
  const [db, setDb] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [status, setStatus] = useState("booting");
  const [initError, setInitError] = useState(null);
  const [schema, setSchema] = useState([]);

  const workerRef = useRef(null);
  const dbRef = useRef(null);
  const initSeqRef = useRef(0);
  const mountedRef = useRef(false);

  const refreshSchema = useCallback(async (database = dbRef.current) => {
    if (!database) return [];
    try {
      const nextSchema = await readPublicSchema(database);
      if (mountedRef.current) setSchema(nextSchema);
      return nextSchema;
    } catch (err) {
      console.warn("Schema refresh failed:", err);
      return [];
    }
  }, []);

  const initDb = useCallback(async (loadBlob = null, options = {}) => {
    const seq = ++initSeqRef.current;
    const dataDir = `idb://${IDB_NAME}`;

    try {
      setDb(null);
      setIsReady(false);
      setInitError(null);
      setSchema([]);
      setStatus(loadBlob ? "restoring" : "booting");

      const oldWorker = workerRef.current;
      workerRef.current = null;
      dbRef.current = null;
      await closeDatabaseQuietly(oldWorker);
      if (seq !== initSeqRef.current) return;

      if (loadBlob && options.overwriteLocal) {
        await deleteIndexedDbDatabase(IDB_NAME);
        await deleteIndexedDbDatabase(`/pglite/${IDB_NAME}`);
      }
      if (seq !== initSeqRef.current) return;

      const workerInstance = await PGliteWorker.create(
        new Worker(new URL("../lib/dbWorker.js", import.meta.url), { type: "module" }),
        { dataDir, loadDataDir: loadBlob }
      );

      if (seq !== initSeqRef.current) {
        await closeDatabaseQuietly(workerInstance);
        return;
      }

      workerRef.current = workerInstance;
      dbRef.current = workerInstance;

      const stateBeforeInit = getDatabaseState();
      let nextSchema = await readPublicSchema(workerInstance);
      if (seq !== initSeqRef.current) {
        await closeDatabaseQuietly(workerInstance);
        return;
      }

      const shouldSeedDemo = options.seedDemo === true || (!loadBlob && !stateBeforeInit && nextSchema.length === 0);

      if (shouldSeedDemo) {
        await workerInstance.exec(SEED_SQL);
        if (seq !== initSeqRef.current) {
          await closeDatabaseQuietly(workerInstance);
          return;
        }
        nextSchema = await readPublicSchema(workerInstance);
        if (seq !== initSeqRef.current) {
          await closeDatabaseQuietly(workerInstance);
          return;
        }
      }

      setDb(workerInstance);
      setSchema(nextSchema);
      setIsReady(true);
      setStatus("ready");
      if (loadBlob) {
        setDatabaseState("restored");
      } else if (shouldSeedDemo) {
        setDatabaseState("seeded");
      } else if (!stateBeforeInit) {
        setDatabaseState("initialized");
      }
    } catch (error) {
      console.error("Database initialization failed:", error);
      if (seq === initSeqRef.current) {
        setInitError(error?.message || "Failed to initialize the local SQL database.");
        setStatus("error");
        setIsReady(false);
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    void initDb();

    return () => {
      mountedRef.current = false;
      initSeqRef.current += 1;
      const worker = workerRef.current;
      workerRef.current = null;
      dbRef.current = null;
      void closeDatabaseQuietly(worker);
    };
  }, [initDb]);

  const execSql = useCallback(async (sql) => {
    const database = dbRef.current;
    if (!database) throw new Error("Database is not ready yet.");

    const started = performance.now();
    const res = await database.exec(sql, { rowMode: "array" });
    const elapsedMs = Math.round(performance.now() - started);
    const normalized = normalizeExecResults(res, elapsedMs);
    await refreshSchema(database);

    if (!normalized.length) {
      return [{ id: `result-${Date.now()}`, title: "Success", fields: [], rows: [], affectedRows: null, elapsedMs }];
    }
    return normalized;
  }, [refreshSchema]);

  const exportDb = useCallback(async () => {
    const database = dbRef.current;
    if (!database) return;
    const blob = await database.dumpDataDir("auto");
    downloadBlob(blob, `sql-studio-backup-${new Date().toISOString().slice(0, 10)}.tar`, "application/x-tar");
  }, []);

  const importDb = useCallback(async (file) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".tar")) throw new Error("Please choose a .tar backup file.");
    if (file.size > 50 * 1024 * 1024) throw new Error("Backup file is too large. Maximum supported size is 50MB.");
    const arrayBuffer = await file.arrayBuffer();
    const safeBlob = new Blob([arrayBuffer], { type: "application/x-tar" });
    await initDb(safeBlob, { overwriteLocal: true });
  }, [initDb]);

  const resetDb = useCallback(async () => {
    const oldWorker = workerRef.current;
    workerRef.current = null;
    dbRef.current = null;
    await closeDatabaseQuietly(oldWorker);
    await deleteIndexedDbDatabase(IDB_NAME);
    await deleteIndexedDbDatabase(`/pglite/${IDB_NAME}`);
    await initDb(null, { seedDemo: true });
  }, [initDb]);

  const importCsvFile = useCallback(async (file, requestedTableName, options = {}) => {
    const database = dbRef.current;
    if (!database || !file) throw new Error("Database is not ready yet.");
    if (file.size > 5 * 1024 * 1024) throw new Error("CSV file is too large for browser import. Keep it under 5MB.");
    const text = await file.text();
    const parsed = parseCsv(text);
    if (!parsed.headers.length) throw new Error("CSV file has no header row.");
    const tableName = safeTableName(requestedTableName || file.name);
    const sql = buildImportSql({ tableName, headers: parsed.headers, rows: parsed.rows, replaceExisting: options.replaceExisting === true });
    await execSql(sql);
    await refreshSchema(database);
    return { tableName, rowCount: parsed.rows.length };
  }, [execSql, refreshSchema]);

  const quickSql = useMemo(() => ({
    preview: (table) => `SELECT * FROM ${quoteIdentifier(table)} LIMIT 100;`,
    count: (table) => `SELECT COUNT(*) AS total_rows FROM ${quoteIdentifier(table)};`,
    describe: (table) => `SELECT column_name, data_type, is_nullable, column_default\nFROM information_schema.columns\nWHERE table_schema = 'public' AND table_name = '${String(table).replaceAll("'", "''")}'\nORDER BY ordinal_position;`,
    insertTemplate: (table) => {
      const item = schema.find((entry) => entry.tableName === table);
      const columns = item?.columns?.filter((col) => !String(col.column_default || "").includes("nextval")) || [];
      const names = columns.map((col) => quoteIdentifier(col.column_name)).join(", ");
      const values = columns.map((col) => col.data_type?.includes("int") || col.data_type?.includes("numeric") ? "0" : "'value'").join(", ");
      return `INSERT INTO ${quoteIdentifier(table)} (${names})\nVALUES (${values})\nRETURNING *;`;
    },
  }), [schema]);

  const value = useMemo(() => ({
    db,
    isReady,
    status,
    initError,
    schema,
    execSql,
    refreshSchema,
    exportDb,
    importDb,
    resetDb,
    importCsvFile,
    quickSql,
  }), [db, isReady, status, initError, schema, execSql, refreshSchema, exportDb, importDb, resetDb, importCsvFile, quickSql]);

  return <DbContext.Provider value={value}>{children}</DbContext.Provider>;
}

export function useDb() {
  const context = useContext(DbContext);
  if (!context) throw new Error("useDb must be used inside DatabaseProvider");
  return context;
}
