import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ContractAuthorityProof } from '@/lib/schemas/contract-authority';
import { api } from '../client';
import {
  archiveOrgDepartment,
  createMemberDepartmentGrant,
  replaceMemberDepartmentGrant,
  restoreOrgDepartment,
  revokeMemberDepartmentGrant,
} from '../org-structure';
import { changeTeamMemberRole, deactivateTeamMember, reactivateTeamMember } from '../orgs-team';

vi.mock('../client', () => ({
  api: {
    delete: vi.fn(),
    patch: vi.fn(),
    post: vi.fn(),
  },
}));

const ORG_ID = 'org-id';
const USER_ID = '11111111-1111-4111-8111-111111111111';
const WALLET_ADDRESS = '0x2222222222222222222222222222222222222222';
const GRANT_ID = 'grant-id';
const DEPARTMENT_ID = 'department-id';
const AUTHORITY_PROOF = {
  bundleHash: `0x${'a'.repeat(64)}`,
  requests: [
    {
      message: {
        from: WALLET_ADDRESS,
        to: '0x3333333333333333333333333333333333333333',
        value: '0',
        gas: '250000',
        nonce: '1',
        deadline: '2000000000',
        data: '0x1234',
      },
      signature: `0x${'b'.repeat(130)}`,
    },
  ],
} satisfies ContractAuthorityProof;

const mockDelete = vi.mocked(api.delete);
const mockPatch = vi.mocked(api.patch);
const mockPost = vi.mocked(api.post);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('contract authority API bodies', () => {
  it('preserves the team role body and only adds proof on finalize', () => {
    const roleBody = { role: 'org_admin' as const, vaultGrant: { wrappedVaultKey: { ciphertext: 'wrapped' } } };

    changeTeamMemberRole(ORG_ID, USER_ID, roleBody.role, roleBody.vaultGrant, null);
    changeTeamMemberRole(ORG_ID, USER_ID, roleBody.role, roleBody.vaultGrant, AUTHORITY_PROOF);

    expect(mockPatch).toHaveBeenNthCalledWith(1, `/orgs/${ORG_ID}/team/${USER_ID}/role`, roleBody, expect.anything());
    expect(mockPatch).toHaveBeenNthCalledWith(
      2,
      `/orgs/${ORG_ID}/team/${USER_ID}/role`,
      { ...roleBody, authorityProof: AUTHORITY_PROOF },
      expect.anything(),
    );
  });

  it('uses an empty prepare body and a proof-only finalize body for lifecycle and department commands', () => {
    deactivateTeamMember(ORG_ID, USER_ID, null);
    deactivateTeamMember(ORG_ID, USER_ID, AUTHORITY_PROOF);
    reactivateTeamMember(ORG_ID, USER_ID, null);
    reactivateTeamMember(ORG_ID, USER_ID, AUTHORITY_PROOF);
    archiveOrgDepartment(ORG_ID, DEPARTMENT_ID, null);
    archiveOrgDepartment(ORG_ID, DEPARTMENT_ID, AUTHORITY_PROOF);
    restoreOrgDepartment(ORG_ID, DEPARTMENT_ID, null);
    restoreOrgDepartment(ORG_ID, DEPARTMENT_ID, AUTHORITY_PROOF);

    expect([
      mockPatch.mock.calls[0]?.[1],
      mockPatch.mock.calls[2]?.[1],
      mockPost.mock.calls[0]?.[1],
      mockPost.mock.calls[2]?.[1],
    ]).toEqual([{}, {}, {}, {}]);
    expect([
      mockPatch.mock.calls[1]?.[1],
      mockPatch.mock.calls[3]?.[1],
      mockPost.mock.calls[1]?.[1],
      mockPost.mock.calls[3]?.[1],
    ]).toEqual([
      { authorityProof: AUTHORITY_PROOF },
      { authorityProof: AUTHORITY_PROOF },
      { authorityProof: AUTHORITY_PROOF },
      { authorityProof: AUTHORITY_PROOF },
    ]);
  });

  it('preserves department grant business bodies across prepare and finalize', () => {
    const departmentBody = { departmentId: DEPARTMENT_ID, roleSlug: 'admin' as const };
    const replacementBody = { roleSlug: 'hiring_member' as const };

    createMemberDepartmentGrant(ORG_ID, USER_ID, departmentBody, null);
    createMemberDepartmentGrant(ORG_ID, USER_ID, departmentBody, AUTHORITY_PROOF);
    replaceMemberDepartmentGrant(ORG_ID, USER_ID, GRANT_ID, replacementBody, null);
    replaceMemberDepartmentGrant(ORG_ID, USER_ID, GRANT_ID, replacementBody, AUTHORITY_PROOF);

    expect(mockPost.mock.calls.map((call) => call[1])).toEqual([
      departmentBody,
      { ...departmentBody, authorityProof: AUTHORITY_PROOF },
    ]);
    expect(mockPatch.mock.calls.map((call) => call[1])).toEqual([
      replacementBody,
      { ...replacementBody, authorityProof: AUTHORITY_PROOF },
    ]);
  });

  it('uses an empty prepare body and a proof-only finalize body for grant revocation', () => {
    revokeMemberDepartmentGrant(ORG_ID, USER_ID, GRANT_ID, null);
    revokeMemberDepartmentGrant(ORG_ID, USER_ID, GRANT_ID, AUTHORITY_PROOF);

    expect(mockDelete.mock.calls.map((call) => call[1])).toEqual([{}, { authorityProof: AUTHORITY_PROOF }]);
  });
});
