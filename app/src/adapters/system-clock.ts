import type { Clock } from '@/domain/ports';

export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}

export const systemClock: Clock = new SystemClock();
