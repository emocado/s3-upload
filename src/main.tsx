import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthProvider } from 'react-oidc-context'
import './index.css'
import App from './App.tsx'

const oidcConfig = {
  authority: "https://cognito-idp.ap-southeast-1.amazonaws.com/ap-southeast-1_zWAM10I87",
  client_id: "69d2bbk3i6ad3ppekfgg41lj51",
  redirect_uri: "http://localhost:5173",
  response_type: "code",
  scope: "openid email profile",
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider {...oidcConfig}>
      <App />
    </AuthProvider>
  </StrictMode>,
)
