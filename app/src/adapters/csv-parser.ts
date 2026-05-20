function splitCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const character = line.charAt(i);
    if (inQuotes) {
      if (character === '"' && line.charAt(i + 1) === '"') {
        current += '"';
        i += 1;
      } else if (character === '"') {
        inQuotes = false;
      } else {
        current += character;
      }
    } else if (character === '"') {
      inQuotes = true;
    } else if (character === ',') {
      fields.push(current);
      current = '';
    } else {
      current += character;
    }
  }
  fields.push(current);
  return fields;
}

export function parseCsv(content: string): readonly Record<string, string>[] {
  const trimmed = content.replace(/^﻿/, '').trim();
  if (trimmed === '') return [];

  const lines = trimmed.split(/\r?\n/);
  const [headerLine, ...dataLines] = lines;
  if (!headerLine) return [];

  const headers = splitCsvLine(headerLine).map((header) => header.trim());

  return dataLines
    .filter((line) => line.trim() !== '')
    .map((line) => {
      const values = splitCsvLine(line);
      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header] = (values[index] ?? '').trim();
      });
      return row;
    });
}
