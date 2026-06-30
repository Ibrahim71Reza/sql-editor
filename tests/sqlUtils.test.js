import assert from "node:assert/strict";
import test from "node:test";
import {
  buildImportSql,
  csvEscape,
  parseCsv,
  resultToCsv,
  safeTableName,
  sqlLiteral,
  uniqueColumnNames,
} from "../lib/sqlUtils.js";

test("parseCsv handles quoted commas, escaped quotes, and blank lines", () => {
  const parsed = parseCsv('Name,Note\n"Aisha, R.","said ""hello"""\n\nTanvir,plain');

  assert.deepEqual(parsed.headers, ["Name", "Note"]);
  assert.deepEqual(parsed.rows, [
    ["Aisha, R.", 'said "hello"'],
    ["Tanvir", "plain"],
  ]);
});

test("safeTableName creates PostgreSQL-safe identifiers", () => {
  assert.equal(safeTableName("Sales Report.csv"), "sales_report");
  assert.equal(safeTableName("2026 imports"), "t_2026_imports");
  assert.equal(safeTableName(""), "imported_data");
});

test("uniqueColumnNames normalizes and deduplicates headers", () => {
  assert.deepEqual(uniqueColumnNames(["Order ID", "Order ID", "2026 Total", ""]), [
    "order_id",
    "order_id_2",
    "c_2026_total",
    "column_4",
  ]);
});

test("SQL and CSV escaping preserve user data safely", () => {
  assert.equal(sqlLiteral("O'Reilly"), "'O''Reilly'");
  assert.equal(sqlLiteral(""), "NULL");
  assert.equal(csvEscape('a "quoted", value'), '"a ""quoted"", value"');
});

test("resultToCsv exports headers and rows", () => {
  const fields = [{ name: "id" }, { name: "note" }];
  const rows = [{ id: 1, note: "hello, world" }, { id: 2, note: null }];

  assert.equal(resultToCsv(fields, rows), 'id,note\n1,"hello, world"\n2,');
});

test("resultToCsv supports array rows with duplicate column names", () => {
  const fields = [{ name: "id" }, { name: "id" }];
  const rows = [[1, 10], [2, 20]];

  assert.equal(resultToCsv(fields, rows), "id,id\n1,10\n2,20");
});

test("buildImportSql wraps import in a transaction and escapes inserted values", () => {
  const sql = buildImportSql({
    tableName: "people",
    headers: ["Name", "Note"],
    rows: [["Aisha", "O'Reilly"]],
  });

  assert.match(sql, /^BEGIN;/);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS "people"/);
  assert.match(sql, /INSERT INTO "people" \("name", "note"\) VALUES/);
  assert.match(sql, /\('Aisha', 'O''Reilly'\);/);
  assert.match(sql, /COMMIT;$/);
});

test("buildImportSql can replace an existing import table", () => {
  const sql = buildImportSql({
    tableName: "people",
    headers: ["Name"],
    rows: [["Aisha"]],
    replaceExisting: true,
  });

  assert.match(sql, /BEGIN;\n\nDROP TABLE IF EXISTS "people";\n\nCREATE TABLE IF NOT EXISTS "people"/);
});
