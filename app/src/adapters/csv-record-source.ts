import type { RecordSource } from '@/domain/ports';
import type { ClientRecord } from '@/domain/types';
import { parseCsv } from '@/adapters/csv-parser';
import { mapRowToClientRecord } from '@/adapters/client-record-mapper';

const DEFAULT_CSV_URL = '/client_onboarding.csv';

interface CsvRecordSourceOptions {
  readonly csvUrl?: string;
}

export class CsvRecordSource implements RecordSource {
  private readonly csvUrl: string;

  constructor(options: CsvRecordSourceOptions = {}) {
    this.csvUrl = options.csvUrl ?? DEFAULT_CSV_URL;
  }

  async load(): Promise<readonly ClientRecord[]> {
    const response = await fetch(this.csvUrl);
    if (!response.ok) {
      throw new Error(`Failed to load CSV from ${this.csvUrl}: HTTP ${response.status}`);
    }
    const content = await response.text();
    const rows = parseCsv(content);
    return rows.map((row, index) => {
      const result = mapRowToClientRecord(row);
      if (!result.ok) {
        const reason = result.error.map((issue) => `${issue.field}: ${issue.message}`).join('; ');
        throw new Error(`CSV row ${index + 1} is invalid: ${reason}`);
      }
      return result.value;
    });
  }
}
