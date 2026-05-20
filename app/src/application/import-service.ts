import { parseCsv } from '@/adapters/csv-parser';
import {
  findMissingHeaders,
  mapRowToClientRecord,
} from '@/adapters/client-record-mapper';
import type { RowMappingIssue } from '@/adapters/client-record-mapper';
import type { ClientRecord } from '@/domain/types';
import type { RecordStore } from '@/domain/ports';

export interface ImportRowFailure {
  readonly rowNumber: number;
  readonly clientId: string | null;
  readonly issues: readonly RowMappingIssue[];
}

export interface ImportRowDuplicate {
  readonly rowNumber: number;
  readonly clientId: string;
}

export interface ImportPreview {
  readonly newRecords: readonly ClientRecord[];
  readonly duplicates: readonly ImportRowDuplicate[];
  readonly failures: readonly ImportRowFailure[];
  readonly missingHeaders: readonly string[];
  readonly totalRows: number;
}

export interface ImportCommitResult {
  readonly importedCount: number;
  readonly duplicateCount: number;
  readonly failureCount: number;
}

export interface ImportServiceDependencies {
  readonly recordStore: RecordStore;
}

export class ImportService {
  private readonly dependencies: ImportServiceDependencies;

  constructor(dependencies: ImportServiceDependencies) {
    this.dependencies = dependencies;
  }

  parseAndValidate(csvContent: string): ImportPreview {
    const rows = parseCsv(csvContent);
    const headers = rows.length > 0 && rows[0] ? Object.keys(rows[0]) : [];
    const missingHeaders = findMissingHeaders(headers);

    if (missingHeaders.length > 0) {
      return {
        newRecords: [],
        duplicates: [],
        failures: [],
        missingHeaders,
        totalRows: rows.length,
      };
    }

    const existingClientIds = new Set(
      this.dependencies.recordStore.list().map((record) => record.clientId),
    );

    const newRecords: ClientRecord[] = [];
    const duplicates: ImportRowDuplicate[] = [];
    const failures: ImportRowFailure[] = [];
    const seenInThisImport = new Set<string>();

    rows.forEach((row, index) => {
      const rowNumber = index + 1;
      const mapped = mapRowToClientRecord(row);
      if (!mapped.ok) {
        failures.push({
          rowNumber,
          clientId: row['client_id']?.trim() || null,
          issues: mapped.error,
        });
        return;
      }
      const record = mapped.value;
      if (existingClientIds.has(record.clientId) || seenInThisImport.has(record.clientId)) {
        duplicates.push({ rowNumber, clientId: record.clientId });
        return;
      }
      seenInThisImport.add(record.clientId);
      newRecords.push(record);
    });

    return {
      newRecords,
      duplicates,
      failures,
      missingHeaders: [],
      totalRows: rows.length,
    };
  }

  commit(preview: ImportPreview): ImportCommitResult {
    for (const record of preview.newRecords) {
      this.dependencies.recordStore.add(record);
    }
    return {
      importedCount: preview.newRecords.length,
      duplicateCount: preview.duplicates.length,
      failureCount: preview.failures.length,
    };
  }
}

export function makeImportService(dependencies: ImportServiceDependencies): ImportService {
  return new ImportService(dependencies);
}
