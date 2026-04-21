import React, { useState } from 'react';
import { Box, Code2, RotateCw, Loader2, History, Tag, Clock } from 'lucide-react';
import { getTaskDefinition, restartService } from '../services/api';
import type { ServiceStatus, TaskDefinition, ECRImage } from '../services/api';
import { TaskDefModal } from './TaskDefModal';

interface ServiceCardProps {
  service: ServiceStatus;
  onActionComplete: () => void;
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const ServiceCard: React.FC<ServiceCardProps> = ({ service }) => {
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [restarting, setRestarting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [taskDef, setTaskDef] = useState<TaskDefinition | null>(null);

  const handleViewTaskDef = async () => {
    setLoadingConfig(true);
    try {
      const def = await getTaskDefinition(service.serviceName);
      setTaskDef(def);
      setShowModal(true);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingConfig(false);
    }
  };

  const handleRestart = async () => {
    if (!window.confirm(`Are you sure you want to restart ${service.serviceName}?`)) return;
    
    setRestarting(true);
    try {
      await restartService(service.serviceName);
      alert(`${service.serviceName} restart initiated.`);
    } catch (err) {
      console.error(err);
      alert(`Failed to restart ${service.serviceName}.`);
    } finally {
      setRestarting(false);
    }
  };

  return (
    <>
      <div className="glass-panel" style={styles.card}>
        <div style={styles.header}>
          <div style={styles.iconWrapper}>
            <Box size={20} color="var(--accent-primary)" />
          </div>
          <h3 style={styles.title}>{service.serviceName}</h3>
          
          <div style={{ marginLeft: 'auto' }}>
            <span className={`status-badge ${service.status === 'RUNNING' ? 'success' : 'pending'}`}>
              {service.status}
            </span>
          </div>
        </div>

        <div style={styles.content}>
          <div style={styles.historyHeader}>
            <History size={14} color="var(--text-secondary)" />
            <span style={styles.label}>Latest ECR Images</span>
          </div>
          <div style={styles.imageList}>
            {service.images.map((img: ECRImage, idx: number) => (
              <div key={idx} style={styles.imageRow}>
                <div style={styles.tagBadge}>
                  <Tag size={10} />
                  {img.tag}
                </div>
                <div style={styles.timestamp}>
                  <Clock size={10} />
                  {formatDate(img.pushedAt)}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={styles.actions}>
          <button className="button button-secondary" style={styles.btnFull} onClick={handleViewTaskDef} disabled={loadingConfig}>
            {loadingConfig ? <Loader2 className="animate-spin" size={16} /> : <Code2 size={16} />}
            Task Def
          </button>
          
          <button className="button button-danger" style={styles.btnFull} onClick={handleRestart} disabled={restarting}>
            {restarting ? <Loader2 className="animate-spin" size={16} /> : <RotateCw size={16} />}
            Restart
          </button>
        </div>
      </div>

      {showModal && (
        <TaskDefModal 
          serviceName={service.serviceName} 
          initialTaskDef={taskDef} 
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
};

const styles = {
  card: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '20px',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  iconWrapper: {
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: '16px',
    fontWeight: 600,
    margin: 0,
  },
  content: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
    padding: '16px 0',
    borderTop: '1px solid var(--border-subtle)',
    borderBottom: '1px solid var(--border-subtle)',
  },
  label: {
    fontSize: '11px',
    fontWeight: 700,
    color: 'var(--text-secondary)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },
  historyHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '4px',
  },
  imageList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  imageRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '6px 8px',
    borderRadius: 'var(--radius-sm)',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    fontSize: '12px',
  },
  tagBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontWeight: 500,
    color: 'var(--accent-primary)',
  },
  timestamp: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    color: 'var(--text-secondary)',
  },
  actions: {
    display: 'flex',
    gap: '12px',
  },
  btnFull: {
    flex: 1,
    padding: '8px 4px',
    fontSize: '13px',
  }
};
