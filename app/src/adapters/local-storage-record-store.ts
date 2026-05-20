import type { RecordStore } from '@/domain/ports';
import type { ClientRecord } from '@/domain/types';
import { InMemoryRecordStore } from '@/adapters/in-memory-record-store';

const DEFAULT_STORAGE_KEY = 'halcyon.sentinel.records.v1';
const SERIALIZATION_VERSION = 1;

interface LocalStorageRecordStoreOptions {
  readonly storageKey?: string;
}

interface PersistedPayload {
  readonly version: number;
  readonly records: readonly ClientRecord[];
}

export class LocalStorageRecordStore implements RecordStore {
  private readonly storageKey: string;
  private readonly innerStore: InMemoryRecordStore;

  constructor(options: LocalStorageRecordStoreOptions = {}) {
    this.storageKey = options.storageKey ?? DEFAULT_STORAGE_KEY;
    this.innerStore = new InMemoryRecordStore();
    this.restoreFromLocalStorage();
    this.innerStore.subscribe(() => {
      this.persistToLocalStorage();
    });
  }

  list(): readonly ClientRecord[] {
    return this.innerStore.list();
  }

  get(clientId: string): ClientRecord | null {
    return this.innerStore.get(clientId);
  }

  add(record: ClientRecord): void {
    this.innerStore.add(record);
  }

  seed(records: readonly ClientRecord[]): void {
    this.innerStore.seed(records);
  }

  hasSeed(): boolean {
    return this.innerStore.hasSeed();
  }

  subscribe(listener: () => void): () => void {
    return this.innerStore.subscribe(listener);
  }

  private restoreFromLocalStorage(): void {
    const persistedRecords = this.readPersistedRecords();
    if (persistedRecords === null || persistedRecords.length === 0) return;
    this.innerStore.seed(persistedRecords);
  }

  private readPersistedRecords(): readonly ClientRecord[] | null {
    const rawValue = localStorage.getItem(this.storageKey);
    if (rawValue === null) return null;
    try {
      const parsed = JSON.parse(rawValue) as PersistedPayload | readonly ClientRecord[];
      if (Array.isArray(parsed)) return parsed;
      if (isPersistedPayload(parsed)) return parsed.records;
      return null;
    } catch {
      return null;
    }
  }

  private persistToLocalStorage(): void {
    const payload: PersistedPayload = {
      version: SERIALIZATION_VERSION,
      records: this.innerStore.list(),
    };
    localStorage.setItem(this.storageKey, JSON.stringify(payload));
  }
}

function isPersistedPayload(value: unknown): value is PersistedPayload {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as { version?: unknown; records?: unknown };
  return typeof candidate.version === 'number' && Array.isArray(candidate.records);
}
