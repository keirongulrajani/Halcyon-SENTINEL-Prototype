import type { IdGenerator } from '@/domain/ports';

export class CryptoIdGenerator implements IdGenerator {
  next(): string {
    return crypto.randomUUID();
  }
}

export const cryptoIdGenerator: IdGenerator = new CryptoIdGenerator();
