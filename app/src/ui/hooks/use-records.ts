import { useSyncExternalStore } from 'react';
import { useServices } from '@/ui/providers/services-context';
import type { ClientRecord } from '@/domain/types';

export function useRecords(): readonly ClientRecord[] {
  const { recordStore } = useServices();
  return useSyncExternalStore(
    (listener) => recordStore.subscribe(listener),
    () => recordStore.list(),
    () => recordStore.list(),
  );
}

export function useRecord(clientId: string): ClientRecord | null {
  const { recordStore } = useServices();
  return useSyncExternalStore(
    (listener) => recordStore.subscribe(listener),
    () => recordStore.get(clientId),
    () => recordStore.get(clientId),
  );
}
