import React, { useState, useEffect } from 'react';
import { authenticateWithClientCredentials, setAccessToken } from '../services/api';
import { KeyRound, Loader2 } from 'lucide-react';

export const LoginModal: React.FC<{ onLogin: () => void }> = ({ onLogin }) => {
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Auto-login logic if ENV vars are present (e.g. localhost)
  useEffect(() => {
    const envClientId = import.meta.env.VITE_CLIENT_ID;
    const envClientSecret = import.meta.env.VITE_CLIENT_SECRET;
    if (envClientId && envClientSecret) {
      handleLogin(envClientId, envClientSecret);
    }
  }, []);

  const handleLogin = async (id: string, secret: string) => {
    setError('');
    setLoading(true);
    try {
      const response = await authenticateWithClientCredentials(id, secret);
      setAccessToken(response.access_token);
      onLogin();
    } catch (err) {
      setError('Invalid credentials or network error.');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId || !clientSecret) {
      setError('Please provide both Client ID and Client Secret.');
      return;
    }
    handleLogin(clientId, clientSecret);
  };

  return (
    <div style={styles.overlay}>
      <div className="glass-panel animate-fade-in" style={styles.modal}>
        <div style={styles.header}>
          <div style={styles.iconContainer}>
            <KeyRound size={24} color="var(--accent-primary)" />
          </div>
          <h2>Authentication Required</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
            Please enter your OAuth2 Client Credentials
          </p>
        </div>

        <form onSubmit={onSubmit} style={styles.form}>
          {error && <div style={styles.error}>{error}</div>}
          
          <div style={styles.inputGroup}>
            <label style={styles.label}>Client ID</label>
            <input 
              type="text" 
              className="input" 
              value={clientId} 
              onChange={e => setClientId(e.target.value)} 
              placeholder="Enter Client ID"
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Client Secret</label>
            <input 
              type="password" 
              className="input" 
              value={clientSecret} 
              onChange={e => setClientSecret(e.target.value)} 
              placeholder="Enter Client Secret"
            />
          </div>

          <button type="submit" className="button button-primary" style={{ width: '100%', marginTop: '8px' }} disabled={loading}>
            {loading ? <Loader2 className="animate-spin" size={18} /> : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed' as const,
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  modal: {
    width: '100%',
    maxWidth: '400px',
    padding: '32px',
    boxShadow: 'var(--shadow-glow)',
  },
  header: {
    textAlign: 'center' as const,
    marginBottom: '24px',
  },
  iconContainer: {
    width: '48px',
    height: '48px',
    borderRadius: 'var(--radius-full)',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 16px auto',
  },
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
  },
  label: {
    fontSize: '13px',
    fontWeight: 500,
    color: 'var(--text-secondary)',
  },
  error: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    color: 'var(--danger)',
    padding: '10px 12px',
    borderRadius: 'var(--radius-sm)',
    fontSize: '13px',
    border: '1px solid rgba(239, 68, 68, 0.2)',
  }
};
