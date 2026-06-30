export const APP_KEYS = {
  tabs: "sql-studio-final:tabs",
  activeTab: "sql-studio-final:active-tab",
  history: "sql-studio-final:history",
  saved: "sql-studio-final:saved-queries",
  theme: "sql-studio-final:theme",
  layout: "sql-studio-final:layout",
};

export const DEFAULT_SQL = `-- Welcome to SQL Studio Pro
-- Run with Ctrl/Cmd + Enter. Highlight SQL to run only the selected block.

SELECT id, full_name, department, salary, hired_at
FROM employees
ORDER BY salary DESC
LIMIT 25;`;

export const STARTER_TABS = [
  { id: "tab-welcome", name: "Welcome", sql: DEFAULT_SQL },
  {
    id: "tab-analytics",
    name: "Analytics",
    sql: `SELECT c.name AS customer,
       COUNT(DISTINCT o.id) AS orders,
       ROUND(SUM(oi.quantity * oi.unit_price)::numeric, 2) AS revenue
FROM customers c
JOIN orders o ON o.customer_id = c.id
JOIN order_items oi ON oi.order_id = o.id
GROUP BY c.name
ORDER BY revenue DESC;`,
  },
  {
    id: "tab-schema",
    name: "Schema Lab",
    sql: `CREATE TABLE IF NOT EXISTS notes (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT,
  created_at TIMESTAMP DEFAULT now()
);

INSERT INTO notes (title, body)
VALUES ('First note', 'Created from SQL Studio Pro')
RETURNING *;`,
  },
];

export const SNIPPETS = [
  { name: "Select table", sql: "SELECT * FROM table_name LIMIT 100;" },
  { name: "Create table", sql: "CREATE TABLE table_name (\n  id SERIAL PRIMARY KEY,\n  name TEXT NOT NULL,\n  created_at TIMESTAMP DEFAULT now()\n);" },
  { name: "Insert row", sql: "INSERT INTO table_name (name) VALUES ('Example') RETURNING *;" },
  { name: "Update safely", sql: "UPDATE table_name\nSET name = 'New value'\nWHERE id = 1\nRETURNING *;" },
  { name: "Delete safely", sql: "DELETE FROM table_name\nWHERE id = 1\nRETURNING *;" },
  { name: "Group revenue", sql: "SELECT category, COUNT(*) AS rows_count\nFROM table_name\nGROUP BY category\nORDER BY rows_count DESC;" },
  { name: "Window rank", sql: "SELECT *,\n       RANK() OVER (PARTITION BY department ORDER BY salary DESC) AS rank_in_department\nFROM employees;" },
  { name: "Table sizes", sql: "SELECT schemaname, tablename\nFROM pg_tables\nWHERE schemaname = 'public'\nORDER BY tablename;" },
];

export function id() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function quoteIdentifier(identifier) {
  return `"${String(identifier).replaceAll('"', '""')}"`;
}

export function sqlLiteral(value) {
  if (value === null || value === undefined || value === "") return "NULL";
  return `'${String(value).replaceAll("'", "''")}'`;
}

export function safeTableName(name, fallback = "imported_data") {
  const clean = String(name || fallback)
    .replace(/\.[^.]+$/, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");
  const finalName = clean || fallback;
  return /^[a-z_]/.test(finalName) ? finalName : `t_${finalName}`;
}

export function uniqueColumnNames(headers) {
  const seen = new Map();
  return headers.map((header, index) => {
    let base = String(header || `column_${index + 1}`)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, "_")
      .replace(/^_+|_+$/g, "");
    if (!base) base = `column_${index + 1}`;
    if (!/^[a-z_]/.test(base)) base = `c_${base}`;
    const count = seen.get(base) || 0;
    seen.set(base, count + 1);
    return count ? `${base}_${count + 1}` : base;
  });
}

export function getLocalJson(key, fallback) {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function setLocalJson(key, value) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function compactSql(sql, max = 110) {
  const oneLine = String(sql || "").replace(/\s+/g, " ").trim();
  return oneLine.length > max ? `${oneLine.slice(0, max - 1)}…` : oneLine;
}

export function csvEscape(value) {
  if (value === null || value === undefined) return "";
  const stringValue = String(value);
  if (/[",\n\r]/.test(stringValue)) return `"${stringValue.replaceAll('"', '""')}"`;
  return stringValue;
}

export function resultToCsv(fields, rows) {
  const header = fields.map((field) => csvEscape(field.name)).join(",");
  const body = rows.map((row) => fields.map((field, index) => csvEscape(Array.isArray(row) ? row[index] : row[field.name])).join(",")).join("\n");
  return [header, body].filter(Boolean).join("\n");
}

export function downloadBlob(content, filename, type = "text/plain;charset=utf-8") {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function copyText(text) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

export function formatSql(sql) {
  if (!String(sql || "").trim()) return "";
  let formatted = String(sql)
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\s*,\s*/g, ", ")
    .replace(/\s*;\s*/g, ";\n\n")
    .trim();

  const clauses = [
    "WITH",
    "SELECT",
    "FROM",
    "INNER JOIN",
    "LEFT JOIN",
    "RIGHT JOIN",
    "FULL JOIN",
    "CROSS JOIN",
    "JOIN",
    "WHERE",
    "GROUP BY",
    "HAVING",
    "ORDER BY",
    "LIMIT",
    "OFFSET",
    "UNION",
    "INSERT INTO",
    "VALUES",
    "UPDATE",
    "SET",
    "DELETE FROM",
    "RETURNING",
    "CREATE TABLE",
    "ALTER TABLE",
    "DROP TABLE",
  ];

  for (const clause of clauses) {
    const regex = new RegExp(`\\s+(${clause.replace(/ /g, "\\s+")})\\s+`, "gi");
    formatted = formatted.replace(regex, `\n$1 `);
  }

  formatted = formatted
    .replace(/,\s*(?=[a-zA-Z_"`])/g, ",\n  ")
    .replace(/\(\s*SELECT/gi, "(\nSELECT")
    .replace(/^\n+/, "")
    .replace(/\n{3,}/g, "\n\n");

  return formatted.endsWith(";") ? formatted : `${formatted};`;
}

export function buildSqlInsights(sql) {
  const normalized = String(sql || "").trim();
  const upper = normalized.toUpperCase();
  const type = upper.match(/^(WITH|SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|TRUNCATE|COPY|EXPLAIN)/)?.[1] || "UNKNOWN";
  const tableMatches = [...normalized.matchAll(/(?:from|join|into|update|table)\s+([a-zA-Z_][\w$.\"]*)/gi)];
  const tables = Array.from(new Set(tableMatches.map((m) => m[1].replaceAll('"', ""))));

  const warnings = [];
  if (/\bSELECT\b/i.test(normalized) && !/\bLIMIT\b/i.test(normalized) && !/\bCOUNT\s*\(/i.test(normalized)) {
    warnings.push("SELECT has no LIMIT. Add a LIMIT when previewing unknown or large tables.");
  }
  if (/\bDELETE\s+FROM\b/i.test(normalized) && !/\bWHERE\b/i.test(normalized)) {
    warnings.push("DELETE has no WHERE clause. It can remove every row in the table.");
  }
  if (/\bUPDATE\b/i.test(normalized) && !/\bWHERE\b/i.test(normalized)) {
    warnings.push("UPDATE has no WHERE clause. It can change every row in the table.");
  }
  if (/\bDROP\s+TABLE\b|\bTRUNCATE\b/i.test(normalized)) {
    warnings.push("Destructive command detected. Export a backup first if the data matters.");
  }
  if (/\bSELECT\s+\*/i.test(normalized)) warnings.push("SELECT * is convenient, but explicit columns are safer for reusable queries.");

  const tips = [];
  if (/\bJOIN\b/i.test(normalized)) tips.push("Join detected: verify join keys and expected row counts.");
  if (/\bGROUP\s+BY\b/i.test(normalized)) tips.push("Aggregation detected: validate grouping columns and aliases.");
  if (/\bORDER\s+BY\b/i.test(normalized)) tips.push("ORDER BY detected: exports will be deterministic if sort columns are unique.");
  if (/\bOVER\s*\(/i.test(normalized)) tips.push("Window function detected: useful for ranking, running totals, and cohort analysis.");
  if (!tips.length) tips.push("Use the schema panel to preview tables, insert templates, and inspect columns.");

  return { type, tables, warnings, tips };
}

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let inQuotes = false;
  const input = String(text || "");

  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    const next = input[i + 1];
    if (char === '"') {
      if (inQuotes && next === '"') {
        value += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      row.push(value);
      value = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i++;
      row.push(value);
      if (row.some((cell) => cell !== "")) rows.push(row);
      row = [];
      value = "";
    } else {
      value += char;
    }
  }
  row.push(value);
  if (row.some((cell) => cell !== "")) rows.push(row);

  if (!rows.length) return { headers: [], rows: [] };
  const headers = rows[0].map((h, i) => h || `column_${i + 1}`);
  return { headers, rows: rows.slice(1) };
}

export function buildImportSql({ tableName, headers, rows, replaceExisting = false }) {
  const safeTable = quoteIdentifier(tableName);
  const columns = uniqueColumnNames(headers);
  const quotedColumns = columns.map(quoteIdentifier);
  const create = `CREATE TABLE IF NOT EXISTS ${safeTable} (\n${quotedColumns.map((c) => `  ${c} TEXT`).join(",\n")}\n);`;
  const drop = replaceExisting ? `DROP TABLE IF EXISTS ${safeTable};` : "";
  const chunks = [];
  for (let i = 0; i < rows.length; i += 100) {
    const part = rows.slice(i, i + 100);
    const values = part
      .map((row) => `(${columns.map((_, index) => sqlLiteral(row[index] ?? null)).join(", ")})`)
      .join(",\n");
    if (values) chunks.push(`INSERT INTO ${safeTable} (${quotedColumns.join(", ")}) VALUES\n${values};`);
  }
  return [`BEGIN;`, drop, create, ...chunks, `COMMIT;`].filter(Boolean).join("\n\n");
}

export function profileRows(fields, rows) {
  return fields.map((field, index) => {
    const values = rows.map((row) => Array.isArray(row) ? row[index] : row[field.name]);
    const nonNull = values.filter((value) => value !== null && value !== undefined && value !== "");
    const numeric = nonNull.map((value) => Number(value)).filter((value) => Number.isFinite(value));
    const unique = new Set(nonNull.map((value) => String(value))).size;
    const profile = {
      name: field.name,
      total: rows.length,
      nulls: values.length - nonNull.length,
      unique,
      numeric: numeric.length === nonNull.length && numeric.length > 0,
      min: null,
      max: null,
      avg: null,
    };
    if (profile.numeric) {
      profile.min = Math.min(...numeric);
      profile.max = Math.max(...numeric);
      profile.avg = numeric.reduce((a, b) => a + b, 0) / numeric.length;
    }
    return profile;
  });
}

export function inferChart(fields, rows) {
  if (!fields.length || !rows.length) return null;
  const profiles = profileRows(fields, rows);
  const numericIndex = profiles.findIndex((p) => p.numeric);
  const labelIndex = profiles.findIndex((p) => !p.numeric && p.unique <= Math.min(rows.length, 30));
  const finalLabelIndex = labelIndex >= 0 ? labelIndex : 0;
  if (numericIndex < 0 || finalLabelIndex < 0 || numericIndex === finalLabelIndex) return null;
  const numericField = fields[numericIndex]?.name;
  const labelField = fields[finalLabelIndex]?.name;
  const data = rows.slice(0, 25).map((row) => ({
    label: String((Array.isArray(row) ? row[finalLabelIndex] : row[labelField]) ?? "NULL"),
    value: Number(Array.isArray(row) ? row[numericIndex] : row[numericField]) || 0,
  }));
  const max = Math.max(...data.map((d) => Math.abs(d.value)), 1);
  return { labelField, numericField, data, max };
}
