import React, { useState, useEffect } from 'react';
import { X, Save, FileJson, History, Rocket, Loader2, CheckCircle2 } from 'lucide-react';
import { updateTaskDefinition, manageService } from '../services/api';
import type { TaskDefinition } from '../services/api';

interface TaskDefModalProps {
  serviceName: string;
  taskDefs: TaskDefinition[];
  onClose: () => void;
  onDeploy: () => void;
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const TaskDefModal: React.FC<TaskDefModalProps> = ({ serviceName, taskDefs, onClose, onDeploy }) => {
  const [activeTab, setActiveTab] = useState<'history' | 'json'>('history');
  const [selectedTaskDef, setSelectedTaskDef] = useState<TaskDefinition | null>(taskDefs[0] || null);
  const [jsonText, setJsonText] = useState('');
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (selectedTaskDef) {
      setJsonText(JSON.stringify(selectedTaskDef, null, 2));
    }
  }, [selectedTaskDef]);

  const handleSave = async () => {
    setError('');
    let parsed: any;
    try {
      parsed = JSON.parse(jsonText);
    } catch (err) {
      setError('Invalid JSON format.');
      return;
    }

    setActionLoading(true);
    try {
      await updateTaskDefinition(serviceName, parsed);
      alert('Task definition updated successfully.');
      onClose();
    } catch (err) {
      setError('Failed to update task definition.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeployVersion = async (td: TaskDefinition) => {
    if (!window.confirm(`Are you sure you want to deploy revision ${td.revision} to ${serviceName}?`)) return;

    setActionLoading(true);
    try {
      await manageService(serviceName, 'restart', td.taskDefinitionArn);
      alert(`Deployment of revision ${td.revision} initiated.`);
      onDeploy();
      onClose();
    } catch (err) {
      setError(`Failed to deploy revision ${td.revision}.`);
    } finally {
      setActionLoading(false);
    }
  };

  if (!taskDefs || taskDefs.length === 0) return null;

  return (
    <div style={styles.overlay}>
      <div className="glass-panel animate-fade-in" style={styles.modal}>
        <div style={styles.header}>
          <div style={styles.titleArea}>
            <History size={20} color="var(--accent-primary)" />
            <div style={styles.titleText}>
              <h3 style={styles.title}>{serviceName}</h3>
              <span style={styles.subtitle}>Task Definition Management</span>
            </div>
          </div>
          <button onClick={onClose} style={styles.closeBtn}>
            <X size={20} />
          </button>
        </div>

        <div style={styles.tabs}>
          <button 
            style={{...styles.tab, ...(activeTab === 'history' ? styles.activeTab : {})}} 
            onClick={() => setActiveTab('history')}
          >
            <History size={14} /> History (Top 5)
          </button>
          <button 
            style={{...styles.tab, ...(activeTab === 'json' ? styles.activeTab : {})}} 
            onClick={() => setActiveTab('json')}
          >
            <FileJson size={14} /> Configuration
          </button>
        </div>

        <div style={styles.content}>
          {error && <div style={styles.error}>{error}</div>}

          {activeTab === 'history' ? (
            <div style={styles.historyList}>
              {taskDefs.map((td) => (
                <div key={td.taskDefinitionArn} style={{
                  ...styles.historyItem,
                  ...(td.isCurrent ? styles.currentItem : {})
                }}>
                  <div style={styles.historyMain}>
                    <div style={styles.revisionInfo}>
                      <span style={styles.revNum}>Rev {td.revision}</span>
                      {td.isCurrent && (
                        <span style={styles.currentBadge}>
                          <CheckCircle2 size={10} /> CURRENT
                        </span>
                      )}
                    </div>
                    <div style={styles.dateInfo}>
                       <span>Created: {formatDate(td.registeredAt)}</span>
                       <span style={styles.arnText}>{td.taskDefinitionArn.split('/').pop()}</span>
                    </div>
                  </div>
                  
                  <div style={styles.historyActions}>
                    <button 
                      className="button button-secondary" 
                      style={styles.actionBtn}
                      onClick={() => { setSelectedTaskDef(td); setActiveTab('json'); }}
                    >
                      View
                    </button>
                    {!td.isCurrent && (
                      <button 
                        className="button button-primary" 
                        style={styles.actionBtn}
                        onClick={() => handleDeployVersion(td)}
                        disabled={actionLoading}
                      >
                        {actionLoading ? <Loader2 className="animate-spin" size={14} /> : <Rocket size={14} />}
                        Deploy
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={styles.jsonContainer}>
              <div style={styles.editorHeader}>
                 <span style={styles.editorLabel}>JSON Configuration (Rev {selectedTaskDef?.revision})</span>
              </div>
              <textarea
                className="input"
                style={styles.textarea}
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                spellCheck={false}
              />
              <div style={styles.footer}>
                <button className="button button-secondary" onClick={() => setActiveTab('history')} disabled={actionLoading}>
                  Back to History
                </button>
                <button className="button button-primary" onClick={handleSave} disabled={actionLoading}>
                  {actionLoading ? <Loader2 className="animate-spin" size={16} /> : (
                    <>
                      <Save size={16} /> Save & Create New Revision
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
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
    maxWidth: '850px',
    height: '85vh',
    display: 'flex',
    flexDirection: 'column' as const,
    margin: '20px',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '24px 32px',
    borderBottom: '1px solid var(--border-subtle)',
  },
  titleArea: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  titleText: {
    display: 'flex',
    flexDirection: 'column' as const,
  },
  title: {
    fontSize: '18px',
    fontWeight: 700,
    margin: 0,
    color: 'var(--text-primary)',
  },
  subtitle: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    letterSpacing: '0.02em',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    display: 'flex',
    padding: '8px',
    borderRadius: '50%',
    transition: 'background 0.2s',
    '&:hover': {
      backgroundColor: 'rgba(255,255,255,0.05)',
    }
  },
  tabs: {
    display: 'flex',
    padding: '0 32px',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderBottom: '1px solid var(--border-subtle)',
    gap: '4px',
  },
  tab: {
    padding: '14px 20px',
    background: 'none',
    border: 'none',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    borderBottom: '2px solid transparent',
    transition: 'all 0.2s',
  },
  activeTab: {
    color: 'var(--accent-primary)',
    borderBottom: '2px solid var(--accent-primary)',
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
  },
  content: {
    flex: 1,
    padding: '24px 32px',
    display: 'flex',
    flexDirection: 'column' as const,
    minHeight: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.3)',
  },
  historyList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
    overflowY: 'auto' as const,
    paddingRight: '4px',
  },
  historyItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderRadius: '12px',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid var(--border-subtle)',
    transition: 'transform 0.2s, border-color 0.2s',
  },
  currentItem: {
    borderColor: 'rgba(34, 197, 94, 0.3)',
    backgroundColor: 'rgba(34, 197, 94, 0.03)',
  },
  historyMain: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
  },
  revisionInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  revNum: {
    fontSize: '15px',
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  currentBadge: {
    fontSize: '9px',
    fontWeight: 800,
    padding: '2px 8px',
    borderRadius: '4px',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    color: '#4ade80',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    border: '1px solid rgba(34, 197, 94, 0.2)',
  },
  dateInfo: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '2px',
    fontSize: '12px',
    color: 'var(--text-secondary)',
  },
  arnText: {
    fontFamily: 'monospace',
    fontSize: '11px',
    opacity: 0.6,
  },
  historyActions: {
    display: 'flex',
    gap: '8px',
  },
  actionBtn: {
    padding: '8px 16px',
    fontSize: '12px',
    fontWeight: 600,
    gap: '6px',
  },
  jsonContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
    flex: 1,
    minHeight: 0,
  },
  editorHeader: {
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--text-secondary)',
  },
  editorLabel: {
    borderLeft: '3px solid var(--accent-primary)',
    paddingLeft: '10px',
  },
  textarea: {
    flex: 1,
    fontFamily: 'monospace',
    fontSize: '13px',
    lineHeight: '1.6',
    resize: 'none' as const,
    padding: '20px',
    backgroundColor: '#00000060',
    border: '1px solid var(--border-subtle)',
    borderRadius: '8px',
    color: '#e2e8f0',
  },
  error: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    color: 'var(--danger)',
    padding: '12px 16px',
    borderRadius: '8px',
    fontSize: '13px',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    marginBottom: '20px',
  },
  footer: {
    paddingTop: '16px',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
  }
};
