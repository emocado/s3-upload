import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthProvider } from 'react-oidc-context'
import './index.css'
import App from './App.tsx'
import { getCurrentEnv } from './config/environments'

const env = getCurrentEnv();

const oidcConfig = {
  authority: env.cognitoAuthority,
  client_id: env.cognitoClientId,
  redirect_uri: env.appUrl,
  response_type: "code",
  scope: `openid email profile ${import.meta.env.VITE_API_SCOPE}`,
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider {...oidcConfig}>
      <App />
    </AuthProvider>
  </StrictMode>,
)
