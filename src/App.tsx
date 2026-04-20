import { useState, useEffect } from 'react';
import { LayoutDashboard, Loader2, LogOut } from 'lucide-react';
import { useAuth } from 'react-oidc-context';
import { LandingPage } from './components/LandingPage';
import { Uploader } from './components/Uploader';
import { ServiceCard } from './components/ServiceCard';
import { getServicesStatus, getAccessToken, setAccessToken } from './services/api';
import type { ServiceStatus } from './services/api';
import './App.css';

function App() {
  const auth = useAuth();
  const [manualAuthenticated, setManualAuthenticated] = useState(false);
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);

  // Sync OIDC token with API service
  useEffect(() => {
    if (auth.isAuthenticated && auth.user?.access_token) {
      setAccessToken(auth.user.access_token);
    }
  }, [auth.isAuthenticated, auth.user]);

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
      <header className="header">
        <div className="header-content">
          <div className="flex items-center gap-4">
            <LayoutDashboard color="var(--accent-primary)" size={28} />
            <h1>ECS Dashboard</h1>
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
              {loadingServices ? <Loader2 className="animate-spin" size={16}/> : 'Refresh'}
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
