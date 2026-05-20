import { useMemo } from 'react';
import { useServices } from '@/ui/providers/services-context';
import type { AssessmentDraft, Verdict } from '@/domain/types';

export function useVerdictPreview(draft: AssessmentDraft): Verdict {
  const { assessmentService } = useServices();
  return useMemo(() => assessmentService.preview(draft), [assessmentService, draft]);
}
