/**
 * environments.ts
 * Manages configuration for different AWS environments.
 */

export interface EnvironmentConfig {
  id: string;
  name: string;
  apiBaseUrl: string;
  cognitoDomain: string;
  cognitoAuthority: string;
  cognitoClientId: string;
  appUrl: string;
  color: string;
}

export const ENVIRONMENTS: Record<string, EnvironmentConfig> = {
  dev: {
    id: 'dev',
    name: 'Development',
    apiBaseUrl: import.meta.env.VITE_DEV_API_BASE_URL,
    cognitoDomain: import.meta.env.VITE_DEV_COGNITO_DOMAIN,
    cognitoAuthority: import.meta.env.VITE_DEV_COGNITO_AUTHORITY,
    cognitoClientId: import.meta.env.VITE_DEV_COGNITO_CLIENT_ID,
    appUrl: import.meta.env.VITE_APP_URL,
    color: '#3b82f6', // Blue
  },
  qa: {
    id: 'qa',
    name: 'QA',
    apiBaseUrl: import.meta.env.VITE_QA_API_BASE_URL,
    cognitoDomain: import.meta.env.VITE_QA_COGNITO_DOMAIN,
    cognitoAuthority: import.meta.env.VITE_QA_COGNITO_AUTHORITY,
    cognitoClientId: import.meta.env.VITE_QA_COGNITO_CLIENT_ID,
    appUrl: import.meta.env.VITE_APP_URL,
    color: '#10b981', // Emerald
  },
  stg: {
    id: 'stg',
    name: 'Staging',
    apiBaseUrl: import.meta.env.VITE_STG_API_BASE_URL,
    cognitoDomain: import.meta.env.VITE_STG_COGNITO_DOMAIN,
    cognitoAuthority: import.meta.env.VITE_STG_COGNITO_AUTHORITY,
    cognitoClientId: import.meta.env.VITE_STG_COGNITO_CLIENT_ID,
    appUrl: import.meta.env.VITE_APP_URL,
    color: '#f59e0b', // Amber
  },
  prod: {
    id: 'prod',
    name: 'Production',
    apiBaseUrl: import.meta.env.VITE_PROD_API_BASE_URL,
    cognitoDomain: import.meta.env.VITE_PROD_COGNITO_DOMAIN,
    cognitoAuthority: import.meta.env.VITE_PROD_COGNITO_AUTHORITY,
    cognitoClientId: import.meta.env.VITE_PROD_COGNITO_CLIENT_ID,
    appUrl: import.meta.env.VITE_APP_URL,
    color: '#ef4444', // Red
  },
};

const STORAGE_KEY = 'selected_aws_environment';

export const getCurrentEnv = (): EnvironmentConfig => {
  const savedId = localStorage.getItem(STORAGE_KEY);
  return (savedId && ENVIRONMENTS[savedId]) || ENVIRONMENTS.prod;
};

export const setCurrentEnv = (id: string) => {
  if (ENVIRONMENTS[id]) {
    localStorage.setItem(STORAGE_KEY, id);
  }
};

export const getAllEnvs = () => Object.values(ENVIRONMENTS);
