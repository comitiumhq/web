import { activeDeployment } from './deployment-catalog';

export const CONTRACT_ADDRESS = {
  JOB_FUNDS: activeDeployment.contracts.jobFunds.address,
  ORGANIZATION_REGISTRY: activeDeployment.contracts.orgRegistry.address,
} as const;
