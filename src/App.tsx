import { useState, useEffect } from 'react';
import { LayoutDashboard, Loader2, LogOut, AlertTriangle, ShieldCheck, Settings, Activity } from 'lucide-react';
import { useAuth } from 'react-oidc-context';
import { LandingPage } from './components/LandingPage';
import { Uploader } from './components/Uploader';
import { ServiceCard } from './components/ServiceCard';
import { getServicesStatus, setAccessToken } from './services/api';
import { getCurrentEnv } from './config/environments';
import type { ServiceStatus } from './services/api';
import './App.css';

function App() {
  const auth = useAuth();
  const currentEnv = getCurrentEnv();
  const [manualAuthenticated, setManualAuthenticated] = useState(true);
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
    document.title = `[${prefix}] ECS Dashboard`;
    
    return () => {
      document.title = 'ECS Dashboard';
    };
  }, [currentEnv]);

  const isAuthenticated = auth.isAuthenticated || manualAuthenticated;

  useEffect(() => {
    if (isAuthenticated) {
      fetchServices();
    }
  }, [isAuthenticated]);

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
              <h1>ECS Dashboard</h1>
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
      </header>

      <main className="main-content">
        {/* Upload Section */}
        <section>
          <Uploader />
        </section>

        {/* Services Grid Section */}
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
      </main>
    </div>
  );
}

export default App;
