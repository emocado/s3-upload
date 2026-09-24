import { useState, useEffect } from 'react';
import { LayoutDashboard, Loader2, LogOut, AlertTriangle, ShieldCheck, Activity, Layers, UploadCloud, Server } from 'lucide-react';
import { useAuth } from 'react-oidc-context';
import { LandingPage } from './components/LandingPage';
import { Uploader } from './components/Uploader';
import { ServiceCard } from './components/ServiceCard';
import { PreviewDashboard } from './components/PreviewDashboard';
import { getServicesStatus, setAccessToken } from './services/api';
import { getCurrentEnv } from './config/environments';
import type { ServiceStatus } from './services/api';
import './App.css';

function App() {
  const auth = useAuth();
  const currentEnv = getCurrentEnv();
  const [manualAuthenticated, setManualAuthenticated] = useState(true);
  const [activeTab, setActiveTab] = useState<'previews' | 'uploader' | 'services'>('previews');
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);

  // Sync OIDC token with API service
  useEffect(() => {
    if (auth.isAuthenticated && auth.user?.access_token) {
      setAccessToken(auth.user.access_token);
    }
  }, [auth.isAuthenticated, auth.user]);

  // Environment-specific UI updates
  useEffect(() => {
    // Update theme color
    document.documentElement.style.setProperty('--env-color', currentEnv.color);
    
    // Update document title
    const prefix = currentEnv.id === 'prod' ? '🚨 PRODUCTION' : currentEnv.name.toUpperCase();
    document.title = `[${prefix}] Preview Environments Dashboard`;
    
    return () => {
      document.title = 'ECS Dashboard';
    };
  }, [currentEnv]);

  const isAuthenticated = auth.isAuthenticated || manualAuthenticated;

  useEffect(() => {
    if (isAuthenticated && activeTab === 'services') {
      fetchServices();
    }
  }, [isAuthenticated, activeTab]);

  const fetchServices = async () => {
    setLoadingServices(true);
    try {
      const data = await getServicesStatus();
      setServices(data);
    } catch (err) {
      console.error('Failed to load services', err);
    } finally {
      setLoadingServices(false);
    }
  };

  const handleLogout = () => {
    if (auth.isAuthenticated) {
      auth.removeUser();
    }
    setAccessToken(null);
    setManualAuthenticated(false);
  };

  if (!isAuthenticated) {
    return <LandingPage onAuthSuccess={() => setManualAuthenticated(true)} />;
  }

  return (
    <div className="app-container animate-fade-in">
      <div className={`top-banner ${currentEnv.id}`}>
        {currentEnv.id === 'prod' ? <AlertTriangle size={14} className="mr-2" /> : <ShieldCheck size={14} className="mr-2" />}
        <span>Active Environment: <strong>{currentEnv.name}</strong></span>
        {currentEnv.id === 'prod' && <span className="ml-4 opacity-75 hidden sm:inline">| USE CAUTION</span>}
      </div>

      <header className="header" style={{ borderTop: `2px solid ${currentEnv.color}` }}>
        <div className="header-content">
          <div className="flex items-center gap-4">
            <LayoutDashboard color={currentEnv.color} size={28} />
            <div className="flex flex-col">
              <h1>UTD Dashboard</h1>
              <div className="flex items-center gap-2">
                <span className="env-tag">
                  {currentEnv.id === 'prod' && <Activity size={10} className="animate-pulse" />}
                  {currentEnv.name}
                </span>
                <button
                  onClick={() => { handleLogout(); window.location.reload(); }}
                  className="link-button"
                >
                  Switch
                </button>
              </div>
            </div>
          </div>
          <button
            className="button button-secondary flex items-center justify-center gap-2"
            onClick={handleLogout}
          >
            <LogOut size={16} /> Sign Out
          </button>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '20px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
          <button
            onClick={() => setActiveTab('previews')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 18px',
              borderRadius: '8px',
              border: activeTab === 'previews' ? '1px solid #38bdf8' : '1px solid transparent',
              background: activeTab === 'previews' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
              color: activeTab === 'previews' ? '#38bdf8' : '#94a3b8',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '14px'
            }}
          >
            <Layers size={16} />
            <span>Preview Environments</span>
          </button>

          <button
            onClick={() => setActiveTab('uploader')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 18px',
              borderRadius: '8px',
              border: activeTab === 'uploader' ? '1px solid #38bdf8' : '1px solid transparent',
              background: activeTab === 'uploader' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
              color: activeTab === 'uploader' ? '#38bdf8' : '#94a3b8',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '14px'
            }}
          >
            <UploadCloud size={16} />
            <span>Legacy S3 Uploader</span>
          </button>

          <button
            onClick={() => setActiveTab('services')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 18px',
              borderRadius: '8px',
              border: activeTab === 'services' ? '1px solid #38bdf8' : '1px solid transparent',
              background: activeTab === 'services' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
              color: activeTab === 'services' ? '#38bdf8' : '#94a3b8',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '14px'
            }}
          >
            <Server size={16} />
            <span>Active ECS Services</span>
          </button>
        </div>
      </header>

      <main className="main-content">
        {activeTab === 'previews' && (
          <PreviewDashboard />
        )}

        {activeTab === 'uploader' && (
          <section>
            <Uploader />
          </section>
        )}

        {activeTab === 'services' && (
          <section>
            <div className="section-header">
              <div className="flex items-center gap-4">
                <h2>Active Services</h2>
                {auth.isAuthenticated && (
                  <span className="px-2 py-1 bg-green-500/10 text-green-400 text-xs rounded border border-green-500/20">
                    Logged in as {auth.user?.profile.email || 'User'}
                  </span>
                )}
              </div>
              <button className="button button-secondary" onClick={fetchServices} disabled={loadingServices}>
                {loadingServices ? <Loader2 className="animate-spin" size={16} /> : 'Refresh'}
              </button>
            </div>

            {loadingServices && services.length === 0 ? (
              <div className="loading-state">
                <Loader2 className="animate-spin text-secondary" size={32} />
                <p>Loading services...</p>
              </div>
            ) : (
              <div className="services-grid">
                {services.map((svc) => (
                  <ServiceCard
                    key={svc.serviceName}
                    service={svc}
                    onActionComplete={fetchServices}
                  />
                ))}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
