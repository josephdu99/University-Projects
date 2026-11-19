/**
 * CSV for the exports studios download (class lists, students, statements,
 * the teacher pay report).
 *
 * Names and notes are typed by students, so a cell that starts with = + - @
 * (or a tab or carriage return) is prefixed with an apostrophe. Otherwise a
 * spreadsheet would run it as a formula when the studio opens the file.
 */
export function csvCell(value: unknown): string {
  let s = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export function toCsv(rows: unknown[][]): string {
  // A byte order mark so Excel reads the file as UTF-8 (names with accents).
  return "﻿" + rows.map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

export function csvResponse(rows: unknown[][], filename: string): Response {
  const safe = filename.replace(/[^a-z0-9._-]+/gi, "-");
  return new Response(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${safe}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

/** "class name" → "class-name", for download file names. */
export function fileSlug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "export";
}
