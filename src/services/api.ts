/**
 * api.ts
 * Handlers for authentication and simulated ECS/S3 backend endpoints.
 */

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
 * 1. Simulates calling Cognito or API gateway using client credentials to get a token.
 * Since this is purely front-end and a mock, we just return a fake token.
 */
export async function authenticateWithClientCredentials(clientId: string, clientSecret: string): Promise<TokenResponse> {
  // In a real scenario, this hits Cognito Token Endpoint
  // const response = await fetch('https://cognito-domain.auth.us-east-1.amazoncognito.com/oauth2/token', ...)
  
  return new Promise((resolve) => {
    setTimeout(() => {
      const mockToken = btoa(`${clientId}:${clientSecret}-mock-token`);
      resolve({
        access_token: mockToken,
        expires_in: 3600
      });
    }, 800); // simulate network latency
  });
}

/**
 * 2. Get S3 Presigned URL from API Gateway
 */
export async function getPresignedUrl(filename: string): Promise<{ uploadUrl: string }> {
  // Mock API call
  return new Promise((resolve) => setTimeout(() => {
    resolve({ uploadUrl: `https://mock-s3-bucket.s3.amazonaws.com/${filename}?presigned=true` });
  }, 500));
}

/**
 * 3. Upload file to S3 using Presigned URL
 * We use fetch/XHR to PUT the file. 
 */
export async function uploadToS3(url: string, file: File, onProgress: (pct: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url, true);
    // Don't set Content-Type header so browser sets it correctly or S3 accepts as-is, depending on presigned URL setup
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
 * 4. Fetch the 8 ECS services statuses
 */
export async function getServicesStatus(): Promise<ServiceStatus[]> {
  const mockImages = (name: string): ECRImage[] => [
    { tag: `v1.0.5`, pushedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString() },
    { tag: `v1.0.4`, pushedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString() },
    { tag: `v1.0.3`, pushedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString() },
    { tag: `v1.0.2`, pushedAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString() },
    { tag: `v1.0.1`, pushedAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString() },
  ];

  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([
        { serviceName: 'Service 1', images: mockImages('Service 1'), status: 'RUNNING' },
        { serviceName: 'Service 2', images: mockImages('Service 2'), status: 'PENDING' },
        { serviceName: 'Service 3', images: mockImages('Service 3'), status: 'RUNNING' },
        { serviceName: 'Service 4', images: mockImages('Service 4'), status: 'RUNNING' },
        { serviceName: 'Service 5', images: mockImages('Service 5'), status: 'RUNNING' },
        { serviceName: 'Service 6', images: mockImages('Service 6'), status: 'RUNNING' },
        { serviceName: 'Service 7', images: mockImages('Service 7'), status: 'STOPPED' },
        { serviceName: 'Service 8', images: mockImages('Service 8'), status: 'RUNNING' },
      ]);
    }, 500);
  });
}

/**
 * 5. Get Task Definition for a service
 */
export async function getTaskDefinition(serviceName: string): Promise<TaskDefinition> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        family: `${serviceName}-task`,
        cpu: "256",
        memory: "512",
        networkMode: "awsvpc",
        containerDefinitions: [
          {
            name: "app",
            image: "123456789012.dkr.ecr.us-east-1.amazonaws.com/my-repo:latest",
            essential: true,
            portMappings: [{ containerPort: 80, hostPort: 80 }]
          }
        ]
      });
    }, 600);
  });
}

/**
 * 6. Update Task Definition
 */
export async function updateTaskDefinition(serviceName: string, newTaskDef: TaskDefinition): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log(`Updated task def for ${serviceName}`, newTaskDef);
      resolve();
    }, 800);
  });
}

/**
 * 7. Restart ECS Service with latest task def
 */
export async function restartService(serviceName: string): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log(`Restarted ${serviceName}`);
      resolve();
    }, 1000);
  });
}

// Helper to simulate calling real API and attaching header
export async function authFetch(url: string, options: RequestInit = {}) {
  const token = getAccessToken();
  const headers = {
    ...options.headers,
    'Authorization': `Bearer ${token}`
  };
  // Fake the fetch call logic for now since everything is mocked in functions above.
  return fetch(url, { ...options, headers: headers as any });
}
