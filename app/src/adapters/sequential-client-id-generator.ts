import type { ClientIdGenerator, RecordStore } from '@/domain/ports';

const CLIENT_ID_PREFIX = 'CLT-';
const CLIENT_ID_PAD_WIDTH = 3;
const CLIENT_ID_PATTERN = /^CLT-(\d+)$/;
const STARTING_SUFFIX = 0;

export class SequentialClientIdGenerator implements ClientIdGenerator {
  private readonly recordStore: RecordStore;

  constructor(recordStore: RecordStore) {
    this.recordStore = recordStore;
  }

  nextClientId(): string {
    const highestExistingSuffix = this.findHighestSuffix();
    const nextSuffix = highestExistingSuffix + 1;
    return `${CLIENT_ID_PREFIX}${nextSuffix.toString().padStart(CLIENT_ID_PAD_WIDTH, '0')}`;
  }

  private findHighestSuffix(): number {
    let highest = STARTING_SUFFIX;
    for (const record of this.recordStore.list()) {
      const match = CLIENT_ID_PATTERN.exec(record.clientId);
      if (!match) continue;
      const suffixText = match[1];
      if (!suffixText) continue;
      const suffix = Number.parseInt(suffixText, 10);
      if (Number.isFinite(suffix) && suffix > highest) {
        highest = suffix;
      }
    }
    return highest;
  }
}
