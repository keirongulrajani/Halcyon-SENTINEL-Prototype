import { detectFindings, detectFindingsForRecord } from '@/domain/findings';
import { classify } from '@/domain/rules-engine';
import type { RuleSet } from '@/domain/rules';
import { DEFAULT_RULES } from '@/domain/rules';
import type { Finding, ClientRecord, Verdict } from '@/domain/types';
import type { RecordStore } from '@/domain/ports';

export interface FindingsServiceDependencies {
  readonly recordStore: RecordStore;
  readonly rules: RuleSet;
}

export class FindingsService {
  private readonly dependencies: FindingsServiceDependencies;

  constructor(dependencies: FindingsServiceDependencies) {
    this.dependencies = dependencies;
  }

  allFindings(): readonly Finding[] {
    return detectFindings(this.dependencies.recordStore.list(), this.dependencies.rules);
  }

  findingsForRecord(clientId: string): readonly Finding[] {
    const record = this.dependencies.recordStore.get(clientId);
    if (record === null) return [];
    return detectFindingsForRecord(record, this.dependencies.rules);
  }

  verdictForRecord(record: ClientRecord): Verdict {
    return classify(record, this.dependencies.rules);
  }

  hasFindings(record: ClientRecord): boolean {
    return detectFindingsForRecord(record, this.dependencies.rules).length > 0;
  }
}

export function makeFindingsService(
  dependencies: Omit<FindingsServiceDependencies, 'rules'> & { readonly rules?: RuleSet },
): FindingsService {
  return new FindingsService({
    recordStore: dependencies.recordStore,
    rules: dependencies.rules ?? DEFAULT_RULES,
  });
}
