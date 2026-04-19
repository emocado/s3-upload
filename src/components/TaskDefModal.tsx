import React, { useState, useEffect } from 'react';
import { X, Save, FileJson } from 'lucide-react';
import { updateTaskDefinition } from '../services/api';
import type { TaskDefinition } from '../services/api';

interface TaskDefModalProps {
  serviceName: string;
  initialTaskDef: TaskDefinition | null;
  onClose: () => void;
}

export const TaskDefModal: React.FC<TaskDefModalProps> = ({ serviceName, initialTaskDef, onClose }) => {
  const [jsonText, setJsonText] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initialTaskDef) {
      setJsonText(JSON.stringify(initialTaskDef, null, 2));
    }
  }, [initialTaskDef]);

  const handleSave = async () => {
    setError('');
    let parsed: TaskDefinition;
    try {
      parsed = JSON.parse(jsonText);
    } catch (err) {
      setError('Invalid JSON format. Please correct it before saving.');
      return;
    }

    setSaving(true);
    try {
      await updateTaskDefinition(serviceName, parsed);
      onClose(); // Success, close modal
    } catch (err) {
      setError('Failed to update task definition.');
    } finally {
      setSaving(false);
    }
  };

  if (!initialTaskDef) return null;

  return (
    <div style={styles.overlay}>
      <div className="glass-panel animate-fade-in" style={styles.modal}>
        <div style={styles.header}>
          <div style={styles.titleArea}>
            <FileJson size={20} color="var(--accent-primary)" />
            <h3 style={styles.title}>Edit Task Definition: {serviceName}</h3>
          </div>
          <button onClick={onClose} style={styles.closeBtn}>
            <X size={20} />
          </button>
        </div>

        <div style={styles.content}>
          {error && <div style={styles.error}>{error}</div>}
          <p style={styles.helperText}>Modify the JSON configuration below and click Save.</p>
          
          <textarea
            className="input"
            style={styles.textarea}
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            spellCheck={false}
          />
        </div>

        <div style={styles.footer}>
          <button className="button button-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button className="button button-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : (
              <>
                <Save size={16} />
                Save Changes
              </>
            )}
          </button>
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
    maxWidth: '800px',
    height: '80vh',
    display: 'flex',
    flexDirection: 'column' as const,
    margin: '20px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 24px',
    borderBottom: '1px solid var(--border-subtle)',
  },
  titleArea: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  title: {
    fontSize: '16px',
    fontWeight: 600,
    margin: 0,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    display: 'flex',
  },
  content: {
    flex: 1,
    padding: '24px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
    minHeight: 0, // important for flex children scrolling
  },
  helperText: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
  },
  error: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    color: 'var(--danger)',
    padding: '10px 12px',
    borderRadius: 'var(--radius-sm)',
    fontSize: '13px',
    border: '1px solid rgba(239, 68, 68, 0.2)',
  },
  textarea: {
    flex: 1,
    fontFamily: 'monospace',
    fontSize: '14px',
    lineHeight: '1.5',
    resize: 'none' as const,
    padding: '16px',
    backgroundColor: '#00000040', // slightly darker for code
  },
  footer: {
    padding: '20px 24px',
    borderTop: '1px solid var(--border-subtle)',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
  }
};
