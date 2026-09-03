import { describe, expect, it } from 'vitest';

import { activeDeployment, deploymentForChain, resolveJobCommitment } from './deployment-catalog';

describe('deployment catalog', () => {
  it('resolves every configured JobCommitment to the supported bindings', () => {
    for (const entry of activeDeployment.contracts.jobCommitments) {
      const resolved = resolveJobCommitment(entry.address);

      expect(resolved.address).toBe(entry.address);
      expect(resolved.commitmentVersion).toBe(entry.commitmentVersion);
      expect(resolved.bindings.commitmentVersion).toBe(entry.commitmentVersion);
    }
  });

  it('rejects an unconfigured JobCommitment address', () => {
    expect(() => resolveJobCommitment('0x1111111111111111111111111111111111111111')).toThrow(
      'Unknown JobCommitment address',
    );
  });

  it('rejects an unconfigured chain', () => {
    expect(() => deploymentForChain(1)).toThrow('No deployment catalog for chain 1');
  });
});
