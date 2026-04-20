/**
 * api.ts
 * Handlers for authentication and simulated ECS/S3 backend endpoints.
 */

const API_BASE_URL = 'https://5y4fp0ghhe.execute-api.ap-southeast-1.amazonaws.com/prod';
// Example: https://ecs-dash-xxxxxx.auth.ap-southeast-1.amazoncognito.com
const COGNITO_DOMAIN_URL = 'https://ecs-dash-0bxd6j.auth.ap-southeast-1.amazoncognito.com';

// Define our types
export interface TokenResponse {
  access_token: string;
  expires_in: number;
}

export interface ECRImage {
  tag: string;
  pushedAt: string;
}

export interface ServiceStatus {
  serviceName: string;
  images: ECRImage[];
  status: 'RUNNING' | 'PENDING' | 'STOPPED';
}

export interface TaskDefinition {
  family: string;
  containerDefinitions: any[];
  cpu: string;
  memory: string;
  [key: string]: any;
}

// Global variable to hold token for this session
let accessToken: string | null = null;

export const setAccessToken = (token: string) => {
  accessToken = token;
};

export const getAccessToken = () => accessToken;

/**
 * 1. Authenticate using Cognito OAuth2 Client Credentials flow.
 */
export async function authenticateWithClientCredentials(clientId: string, clientSecret: string): Promise<TokenResponse> {
  const params = new URLSearchParams();
  params.append('grant_type', 'client_credentials');
  params.append('scope', 'ecs-api/all');

  const response = await fetch(`${COGNITO_DOMAIN_URL}/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Authentication failed');
  }

  return response.json();
}

/**
 * 2. Get S3 Presigned URL from API Gateway
 */
export async function getPresignedUrl(filename: string): Promise<{ uploadUrl: string }> {
  const response = await authFetch(`${API_BASE_URL}/presigned-url?filename=${encodeURIComponent(filename)}`);
  if (!response.ok) throw new Error('Failed to get presigned URL');
  return response.json();
}

/**
 * 3. Upload file to S3 using Presigned URL
 */
export async function uploadToS3(url: string, file: File, onProgress: (pct: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url, true);
    xhr.setRequestHeader("Content-Type", file.type || 'application/octet-stream');

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percentComplete = Math.round((event.loaded / event.total) * 100);
        onProgress(percentComplete);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error('Failed to upload to S3'));
      }
    };

    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.send(file);
  });
}

/**
 * 4. Fetch the ECS services statuses
 */
export async function getServicesStatus(): Promise<ServiceStatus[]> {
  const response = await authFetch(`${API_BASE_URL}/services`);
  if (!response.ok) throw new Error('Failed to fetch services status');
  return response.json();
}

/**
 * 5. Get Task Definition for a service
 */
export async function getTaskDefinition(serviceName: string): Promise<TaskDefinition> {
  const response = await authFetch(`${API_BASE_URL}/task-definition?serviceName=${encodeURIComponent(serviceName)}`);
  if (!response.ok) throw new Error(`Failed to fetch task definition for ${serviceName}`);
  return response.json();
}

/**
 * 6. Update Task Definition
 */
export async function updateTaskDefinition(serviceName: string, newTaskDef: TaskDefinition): Promise<void> {
  const response = await authFetch(`${API_BASE_URL}/update-task`, {
    method: 'POST',
    body: JSON.stringify(newTaskDef),
  });
  if (!response.ok) throw new Error(`Failed to update task definition for ${serviceName}`);
}

/**
 * 7. Restart ECS Service with latest task def
 */
export async function restartService(serviceName: string): Promise<void> {
  const response = await authFetch(`${API_BASE_URL}/restart`, {
    method: 'POST',
    body: JSON.stringify({ serviceName }),
  });
  if (!response.ok) throw new Error(`Failed to restart ${serviceName}`);
}

/**
 * Helper to call real API and attach Authorization header
 */
export async function authFetch(url: string, options: RequestInit = {}) {
  const token = getAccessToken();
  const headers = {
    ...options.headers,
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
  return fetch(url, { ...options, headers });
}
