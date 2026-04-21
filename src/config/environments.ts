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
}

export const ENVIRONMENTS: Record<string, EnvironmentConfig> = {
  dev: {
    id: 'dev',
    name: 'Development',
    apiBaseUrl: 'https://dev-api.example.com/prod',
    cognitoDomain: 'https://ecs-dash-dev.auth.ap-southeast-1.amazoncognito.com',
    cognitoAuthority: 'https://cognito-idp.ap-southeast-1.amazonaws.com/ap-southeast-1_dev_pool',
    cognitoClientId: 'dev_client_id',
    appUrl: import.meta.env.VITE_APP_URL,
  },
  qa: {
    id: 'qa',
    name: 'QA',
    apiBaseUrl: 'https://qa-api.example.com/prod',
    cognitoDomain: 'https://ecs-dash-qa.auth.ap-southeast-1.amazoncognito.com',
    cognitoAuthority: 'https://cognito-idp.ap-southeast-1.amazonaws.com/ap-southeast-1_qa_pool',
    cognitoClientId: 'qa_client_id',
    appUrl: import.meta.env.VITE_APP_URL,
  },
  stg: {
    id: 'stg',
    name: 'Staging',
    apiBaseUrl: 'https://5y4fp0ghhe.execute-api.ap-southeast-1.amazonaws.com/prod',
    cognitoDomain: 'https://ecs-dash-0bxd6j.auth.ap-southeast-1.amazoncognito.com',
    cognitoAuthority: 'https://cognito-idp.ap-southeast-1.amazonaws.com/ap-southeast-1_zWAM10I87',
    cognitoClientId: '69d2bbk3i6ad3ppekfgg41lj51',
    appUrl: import.meta.env.VITE_APP_URL,
  },
  prod: {
    id: 'prod',
    name: 'Production',
    apiBaseUrl: 'https://mpgj92ie2d.execute-api.ap-southeast-1.amazonaws.com/prod',
    cognitoDomain: 'https://ecs-dash-d1de95.auth.ap-southeast-1.amazoncognito.com',
    cognitoAuthority: 'https://cognito-idp.ap-southeast-1.amazonaws.com/ap-southeast-1_VstVtdqzY',
    cognitoClientId: '5p20qbsah6js1nipk35n0mt63m',
    appUrl: import.meta.env.VITE_APP_URL,
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
