"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef } from "react";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => <div className="editor-loading">Loading SQL editor…</div>,
});

export default function SqlEditor({ value, onChange, theme, editorRef, onRun, onSelectionChange }) {
  const monacoRef = useRef(null);

  useEffect(() => {
    if (!monacoRef.current) return;
    const monaco = monacoRef.current;
    monaco.languages.registerCompletionItemProvider("sql", {
      triggerCharacters: [" ", "."],
      provideCompletionItems: () => ({
        suggestions: [
          "SELECT", "FROM", "WHERE", "JOIN", "LEFT JOIN", "GROUP BY", "ORDER BY", "LIMIT",
          "INSERT INTO", "UPDATE", "DELETE FROM", "CREATE TABLE", "ALTER TABLE", "DROP TABLE",
          "COUNT", "SUM", "AVG", "MIN", "MAX", "date_trunc", "employees", "customers", "orders", "order_items"
        ].map((label) => ({
          label,
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText: label,
        })),
      }),
    });
  }, []);

  return (
    <MonacoEditor
      height="100%"
      defaultLanguage="sql"
      theme={theme === "light" ? "light" : "vs-dark"}
      value={value}
      onChange={(next) => onChange(next ?? "")}
      beforeMount={(monaco) => {
        monacoRef.current = monaco;
      }}
      onMount={(editor, monaco) => {
        editorRef.current = editor;
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => onRun?.("selection"));
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.Enter, () => onRun?.("all"));
        editor.onDidChangeCursorSelection(() => {
          const model = editor.getModel();
          const selection = editor.getSelection();
          const selected = model && selection ? model.getValueInRange(selection) : "";
          onSelectionChange?.(selected);
        });
        editor.focus();
      }}
      options={{
        automaticLayout: true,
        fontSize: 14,
        fontLigatures: true,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        smoothScrolling: true,
        wordWrap: "on",
        tabSize: 2,
        padding: { top: 18, bottom: 18 },
        lineNumbersMinChars: 3,
        renderLineHighlight: "all",
        suggest: { showInlineDetails: true },
      }}
    />
  );
}
