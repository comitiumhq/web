import { type CandidateProfile, candidateProfileSchema } from '@comitium/schemas/candidates';
import { type TipTapDoc, tipTapDocSchema } from '@comitium/schemas/common';

export function parseDecryptedCandidateProfile(data: unknown): CandidateProfile | null {
  const result = candidateProfileSchema.safeParse(data);

  if (!result.success) {
    return null;
  }

  return result.data;
}

export function parseDecryptedTipTapDoc(data: unknown): TipTapDoc | null {
  const result = tipTapDocSchema.safeParse(data);

  if (!result.success) {
    return null;
  }

  if (result.data.type !== 'doc') {
    return null;
  }

  return result.data;
}
