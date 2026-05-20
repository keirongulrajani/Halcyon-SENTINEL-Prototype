import type { ClientRecord } from './types';
import type { RuleSet } from './rules';

export interface Clock {
  now(): Date;
}

export interface IdGenerator {
  next(): string;
}

export interface ClientIdGenerator {
  nextClientId(): string;
}

export interface RecordSource {
  load(): Promise<readonly ClientRecord[]>;
}

export interface RulesSource {
  load(): Promise<RuleSet>;
}

export interface RecordStore {
  list(): readonly ClientRecord[];
  get(clientId: string): ClientRecord | null;
  add(record: ClientRecord): void;
  seed(records: readonly ClientRecord[]): void;
  hasSeed(): boolean;
  subscribe(listener: () => void): () => void;
}
