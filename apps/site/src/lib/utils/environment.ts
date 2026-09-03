function isProductionEnvironment(value: string | undefined, viteProduction: boolean): boolean {
  const environment = value?.trim().toLowerCase();

  if (!environment) {
    return viteProduction;
  }

  if (environment === 'production' || environment === 'prod') {
    return true;
  }

  if (environment === 'development' || environment === 'dev' || environment === 'local') {
    return false;
  }

  throw new Error('VITE_ENVIRONMENT must be "development" or "production"');
}

export function isProdEnv(): boolean {
  return isProductionEnvironment(import.meta.env.VITE_ENVIRONMENT, import.meta.env.PROD);
}
