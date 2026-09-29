import { describe, expect, it } from 'vitest';

import { deploymentCatalog, deploymentForChain } from './deployment-catalog';

describe('deployment catalog', () => {
  it('resolves every configured deployment set', () => {
    expect(deploymentCatalog.schemaVersion).toBe(1);

    for (const [chainId, deployment] of Object.entries(deploymentCatalog.deployments)) {
      expect(deploymentForChain(chainId)).toBe(deployment);
    }
  });

  it('rejects an unconfigured chain', () => {
    expect(() => deploymentForChain(1)).toThrow('No deployment catalog for chain 1');
  });
});
