import { useMemo } from 'react';
import { useServices } from '@/ui/providers/services-context';
import { useRecord, useRecords } from './use-records';
import { detectFindings, detectFindingsForRecord } from '@/domain/findings';
import type { ClientRecord, Finding } from '@/domain/types';

function isLiveRecord(record: ClientRecord): boolean {
  return record.supersededBy === undefined;
}

export function useAllFindings(): readonly Finding[] {
  const records = useRecords();
  const { findingsService } = useServices();
  return useMemo(() => {
    void findingsService;
    const liveRecords = records.filter(isLiveRecord);
    return detectFindings(liveRecords);
  }, [records, findingsService]);
}

export function useFindingsForRecord(clientId: string): readonly Finding[] {
  const record = useRecord(clientId);
  return useMemo(
    () => (record === null || !isLiveRecord(record) ? [] : detectFindingsForRecord(record)),
    [record],
  );
}

export function useRecordFindingsCounts(): ReadonlyMap<string, number> {
  const findings = useAllFindings();
  return useMemo(() => {
    const counts = new Map<string, number>();
    for (const finding of findings) {
      counts.set(finding.clientId, (counts.get(finding.clientId) ?? 0) + 1);
    }
    return counts;
  }, [findings]);
}

export function useFindingsByClientId(): ReadonlyMap<string, readonly Finding[]> {
  const findings = useAllFindings();
  return useMemo(() => {
    const byClientId = new Map<string, Finding[]>();
    for (const finding of findings) {
      const bucket = byClientId.get(finding.clientId);
      if (bucket === undefined) {
        byClientId.set(finding.clientId, [finding]);
      } else {
        bucket.push(finding);
      }
    }
    return byClientId;
  }, [findings]);
}
