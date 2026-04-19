import { useState, useEffect } from 'react';
import { LayoutDashboard, Loader2 } from 'lucide-react';
import { LoginModal } from './components/LoginModal';
import { Uploader } from './components/Uploader';
import { ServiceCard } from './components/ServiceCard';
import { getServicesStatus, getAccessToken } from './services/api';
import type { ServiceStatus } from './services/api';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);

  // If token is already present via ENV login in dev
  useEffect(() => {
    if (getAccessToken()) {
      setIsAuthenticated(true);
    }
  }, []);

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

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  if (!isAuthenticated) {
    return (
      <div className="login-bg">
        <LoginModal onLogin={handleLogin} />
      </div>
    );
  }

  return (
    <div className="app-container animate-fade-in">
      <header className="header">
        <div className="header-content">
          <LayoutDashboard color="var(--accent-primary)" size={28} />
          <h1>ECS Deployment Dashboard</h1>
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
            <h2>Active Services</h2>
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
