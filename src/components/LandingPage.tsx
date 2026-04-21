import React, { useState } from 'react';
import { useAuth } from 'react-oidc-context';
import { Shield, Smartphone, Terminal, ArrowRight, Loader2, KeyRound, Globe } from 'lucide-react';
import { authenticateWithClientCredentials, setAccessToken } from '../services/api';
import { getCurrentEnv, getAllEnvs, setCurrentEnv } from '../config/environments';
import './LandingPage.css';

export const LandingPage: React.FC<{ onAuthSuccess: () => void }> = ({ onAuthSuccess }) => {
  const auth = useAuth();
  const currentEnv = getCurrentEnv();
  const allEnvs = getAllEnvs();

  const [showDevLogin, setShowDevLogin] = useState(false);
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDevLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await authenticateWithClientCredentials(clientId, clientSecret);
      setAccessToken(response.access_token);
      onAuthSuccess();
    } catch (err) {
      setError('Invalid credentials or network error.');
    } finally {
      setLoading(false);
    }
  };

  const handleEnvChange = (envId: string) => {
    setCurrentEnv(envId);
    window.location.reload();
  };

  const startStandardLogin = () => {
    auth.signinRedirect();
  };

  if (auth.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0f172a] text-white">
        <Loader2 className="animate-spin text-blue-500" size={48} />
      </div>
    );
  }

  return (
    <div className="landing-container">
      {/* Background decoration */}
      <div className="bg-decoration-1" />
      <div className="bg-decoration-2" />

      <main className="landing-main animate-fade-in">
        {/* Hero Section */}
        <div className="hero-section" style={{ marginBottom: '40px' }}>
          <div className="badge-tag">
            <Shield size={14} />
            SECURE MANAGEMENT CONSOLE
          </div>
          <h1 className="hero-title">
            ECS Deployment <br /> Dashboard
          </h1>
          <p className="hero-subtitle">
            Manage your Amazon ECS clusters, task definitions, and deployments with enterprise-grade security and a streamlined developer experience.
          </p>
        </div>

        {/* Environment Selector */}
        {!showDevLogin && (
          <div className="env-selector animate-slide-up">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Globe size={14} className="text-blue-400" />
              <label className="field-label" style={{ marginBottom: 0 }}>Target Environment</label>
            </div>
            <div className="env-options">
              {allEnvs.map(env => (
                <button
                  key={env.id}
                  className={`env-tab ${currentEnv.id === env.id ? 'active' : ''}`}
                  onClick={() => handleEnvChange(env.id)}
                >
                  {env.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Login Cards */}
        {!showDevLogin ? (
          <div className="auth-grid">
            {/* Standard Login Card */}
            <div className="glass-panel auth-card" onClick={startStandardLogin}>
              <div className="icon-wrapper blue-icon">
                <Smartphone size={28} />
              </div>
              <h3 className="card-title">Standard Login</h3>
              <p className="card-desc">
                Log in via your identity provider using single sign-on. Recommended for most users.
              </p>
              <button className="button button-primary" style={{ width: '100%', gap: '12px' }}>
                Continue with SSO <ArrowRight size={18} />
              </button>
            </div>

            {/* Developer Login Card */}
            <div className="glass-panel auth-card" onClick={() => setShowDevLogin(true)}>
              <div className="icon-wrapper slate-icon">
                <Terminal size={28} />
              </div>
              <h3 className="card-title">Developer Access</h3>
              <p className="card-desc">
                Log in using OAuth2 Client Credentials. Recommended for API integration and service accounts.
              </p>
              <button className="button button-secondary" style={{ width: '100%' }}>
                Use Client Credentials
              </button>
            </div>
          </div>
        ) : (
          /* Developer Login Form */
          <div className="dev-login-container">
            <button onClick={() => setShowDevLogin(false)} className="back-link">
              <ArrowRight size={16} style={{ transform: 'rotate(180deg)' }} /> Back to methods
            </button>

            <div className="glass-panel" style={{ padding: '32px' }}>
              <div className="form-header">
                <KeyRound className="text-blue-400" size={24} color="var(--accent-primary)" />
                <h3 className="card-title" style={{ fontSize: '1.25rem', marginBottom: 0 }}>Client Credentials</h3>
              </div>

              <form onSubmit={handleDevLogin} className="form-fields">
                {error && <div className="error-msg">{error}</div>}

                <div className="field-group">
                  <label className="field-label">Client ID</label>
                  <input
                    type="text"
                    className="input"
                    value={clientId}
                    onChange={e => setClientId(e.target.value)}
                    placeholder="Enter ID"
                    required
                  />
                </div>

                <div className="field-group">
                  <label className="field-label">Client Secret</label>
                  <input
                    type="password"
                    className="input"
                    value={clientSecret}
                    onChange={e => setClientSecret(e.target.value)}
                    placeholder="••••••••••••"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="button button-primary"
                  style={{ width: '100%', padding: '12px', marginTop: '8px' }}
                  disabled={loading}
                >
                  {loading ? <Loader2 className="animate-spin" size={18} /> : 'Authenticate'}
                </button>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* Footer info */}
      <footer className="landing-footer">
        © 2024 ECS Dashboard Management Console. Secure Transmission Enabled.
      </footer>
    </div>
  );
};
