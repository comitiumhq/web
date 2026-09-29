import { activeChain } from './chains';
import { deploymentForChain } from './deployment-catalog';

const activeDeployment = deploymentForChain(activeChain.id);

export const CONTRACT_ADDRESS = {
  COMMITMENT_FUNDS: activeDeployment.contracts.commitmentFunds.address,
  ORGANIZATION_REGISTRY: activeDeployment.contracts.orgRegistry.address,
} as const;
