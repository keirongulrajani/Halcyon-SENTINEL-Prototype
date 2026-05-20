import type { RecordStore } from '@/domain/ports';
import type { ClientRecord } from '@/domain/types';

const ORDER_MOST_RECENT_FIRST = -1;
const ORDER_OLDEST_FIRST = 1;
const EMPTY_SNAPSHOT: readonly ClientRecord[] = Object.freeze([]);

export class InMemoryRecordStore implements RecordStore {
  private readonly recordsById: Map<string, ClientRecord> = new Map();
  private readonly listeners: Set<() => void> = new Set();
  private cachedSnapshot: readonly ClientRecord[] = EMPTY_SNAPSHOT;
  private seeded = false;

  list(): readonly ClientRecord[] {
    return this.cachedSnapshot;
  }

  get(clientId: string): ClientRecord | null {
    return this.recordsById.get(clientId) ?? null;
  }

  add(record: ClientRecord): void {
    this.recordsById.set(record.clientId, record);
    this.rebuildSnapshot();
    this.notifyListeners();
  }

  seed(records: readonly ClientRecord[]): void {
    if (this.seeded) return;
    this.recordsById.clear();
    for (const record of records) {
      this.recordsById.set(record.clientId, record);
    }
    this.seeded = true;
    this.rebuildSnapshot();
    this.notifyListeners();
  }

  hasSeed(): boolean {
    return this.seeded;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private rebuildSnapshot(): void {
    this.cachedSnapshot = Object.freeze(
      [...this.recordsById.values()].sort(compareByOnboardingDateDesc),
    );
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}

function compareByOnboardingDateDesc(left: ClientRecord, right: ClientRecord): number {
  if (left.onboardingDate > right.onboardingDate) return ORDER_MOST_RECENT_FIRST;
  if (left.onboardingDate < right.onboardingDate) return ORDER_OLDEST_FIRST;
  if (left.clientId < right.clientId) return ORDER_MOST_RECENT_FIRST;
  if (left.clientId > right.clientId) return ORDER_OLDEST_FIRST;
  return 0;
}
