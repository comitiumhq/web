import { useCallback } from 'react';

export function useSheetNavigation(
  applicationId: string | null,
  candidateIds?: string[],
  onNavigate?: (applicationId: string) => void,
) {
  const currentIndex = candidateIds?.indexOf(applicationId ?? '') ?? -1;
  const hasPrev = currentIndex > 0;
  const hasNext = candidateIds ? currentIndex < candidateIds.length - 1 : false;

  const handlePrev = useCallback(() => {
    if (!candidateIds || !onNavigate || !applicationId) {
      return;
    }

    const idx = candidateIds.indexOf(applicationId);

    if (idx > 0) {
      onNavigate(candidateIds[idx - 1]);
    }
  }, [candidateIds, applicationId, onNavigate]);

  const handleNext = useCallback(() => {
    if (!candidateIds || !onNavigate || !applicationId) {
      return;
    }

    const idx = candidateIds.indexOf(applicationId);

    if (idx >= 0 && idx < candidateIds.length - 1) {
      onNavigate(candidateIds[idx + 1]);
    }
  }, [candidateIds, applicationId, onNavigate]);

  return { hasPrev, hasNext, handlePrev, handleNext };
}
