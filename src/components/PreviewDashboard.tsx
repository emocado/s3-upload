import React, { useState, useEffect } from 'react';
import { 
  Rocket, 
  ExternalLink, 
  Trash2, 
  RefreshCw, 
  PlusCircle, 
  UploadCloud, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Server, 
  Globe, 
  Layers, 
  Clock, 
  Terminal,
  Activity,
  Code2
} from 'lucide-react';
import { 
  fetchPreviews, 
  createPreview, 
  destroyPreview, 
  getPreviewUploadUrl, 
  triggerUnzip,
  testPreviewBackendApi,
  uploadToS3
} from '../services/api';
import type { PreviewEnvironment } from '../services/api';

export const PreviewDashboard: React.FC = () => {
  const [previews, setPreviews] = useState<PreviewEnvironment[]>([]);
  const [loading, setLoading] = useState(false);
  const [albDomain, setAlbDomain] = useState<string>('');
  const [activeCount, setActiveCount] = useState(0);
  const [maxCapacity, setMaxCapacity] = useState(10);
  const [error, setError] = useState<string | null>(null);

  // Create form state
  const [newPreviewName, setNewPreviewName] = useState('');
  const [imageTag, setImageTag] = useState('node-backend');
  const [creating, setCreating] = useState(false);
  const [createSuccessMsg, setCreateSuccessMsg] = useState<string | null>(null);

  // Upload state
  const [selectedPreviewForUpload, setSelectedPreviewForUpload] = useState<string>('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccessUrl, setUploadSuccessUrl] = useState<string | null>(null);

  // API Test state
  const [testResult, setTestResult] = useState<{ previewName: string; data: any } | null>(null);
  const [testingApi, setTestingApi] = useState<string | null>(null);

  useEffect(() => {
    loadPreviews();
    const interval = setInterval(loadPreviews, 8000);
    return () => clearInterval(interval);
  }, []);

  const loadPreviews = async () => {
    setLoading(true);
    try {
      const data = await fetchPreviews();
      setPreviews(data.previews || []);
      setAlbDomain(data.albDomain || '');
      setActiveCount(data.activeCount || 0);
      setMaxCapacity(data.maxCapacity || 10);
      if (data.previews.length > 0 && !selectedPreviewForUpload) {
        setSelectedPreviewForUpload(data.previews[0].previewName);
      }
    } catch (err: any) {
      console.warn('Failed to load previews', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePreview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPreviewName.trim()) return;

    const formattedName = newPreviewName.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
    setCreating(true);
    setError(null);
    setCreateSuccessMsg(null);

    try {
      await createPreview(formattedName, imageTag.trim());
      setCreateSuccessMsg(`Provisioning initiated for "${formattedName}". Resources are being created!`);
      setNewPreviewName('');
      setSelectedPreviewForUpload(formattedName);
      await loadPreviews();
    } catch (err: any) {
      setError(err.message || 'Failed to create preview environment');
    } finally {
      setCreating(false);
    }
  };

  const handleDestroyPreview = async (name: string) => {
    if (!window.confirm(`Are you sure you want to destroy preview "${name}"? All associated ALB rules, target groups, and ECS services will be cleaned up.`)) {
      return;
    }

    try {
      await destroyPreview(name);
      await loadPreviews();
    } catch (err: any) {
      alert(`Destroy error: ${err.message}`);
    }
  };

  const handleFileUpload = async () => {
    if (!uploadFile || !selectedPreviewForUpload) return;
    setUploading(true);
    setUploadProgress(0);
    setError(null);
    setUploadSuccessUrl(null);

    try {
      // 1. Get Presigned S3 URL
      const { uploadUrl, key, previewUrl } = await getPreviewUploadUrl(uploadFile.name, selectedPreviewForUpload);

      // 2. Upload file to S3
      await uploadToS3(uploadUrl, uploadFile, (pct) => setUploadProgress(pct));

      // 3. Trigger Unzip Lambda
      await triggerUnzip(key, selectedPreviewForUpload);

      setUploadSuccessUrl(previewUrl);
      setUploadFile(null);
      await loadPreviews();
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleTestApi = async (previewName: string) => {
    setTestingApi(previewName);
    setTestResult(null);
    try {
      const domain = albDomain || window.location.hostname;
      const data = await testPreviewBackendApi(domain, previewName);
      setTestResult({ previewName, data });
    } catch (err: any) {
      setTestResult({
        previewName,
        data: { error: err.message, note: 'Make sure ECS task is healthy and ALB rule is active.' }
      });
    } finally {
      setTestingApi(null);
    }
  };

  const formatTtl = (ttl: number | null) => {
    if (!ttl) return 'No TTL';
    const now = Math.floor(Date.now() / 1000);
    const diffSeconds = ttl - now;
    if (diffSeconds <= 0) return 'Expired';
    const hours = Math.floor(diffSeconds / 3600);
    const minutes = Math.floor((diffSeconds % 3600) / 60);
    return `${hours}h ${minutes}m remaining`;
  };

  return (
    <div style={styles.container}>
      {/* Top Section / Header */}
      <div style={styles.topHeader}>
        <div>
          <div style={styles.titleBadge}>
            <Layers size={14} style={{ marginRight: '6px' }} />
            <span>FULL STACK PREVIEWS</span>
          </div>
          <h2 style={styles.mainHeading}>Self-Service Preview Environments</h2>
          <p style={styles.subHeading}>
            Spin up isolated frontend & backend environments with header-based ALB routing and MSK isolation.
          </p>
        </div>
        <div style={styles.statsCard}>
          <div style={styles.slotCount}>
            <span style={{ fontSize: '24px', fontWeight: 700, color: 'var(--accent-primary, #38bdf8)' }}>
              {activeCount}
            </span>
            <span style={{ color: '#94a3b8', fontSize: '14px' }}> / {maxCapacity} slots</span>
          </div>
          <button 
            className="button button-secondary"
            onClick={loadPreviews}
            disabled={loading}
            style={styles.refreshBtn}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {error && (
        <div style={styles.errorAlert} className="animate-fade-in">
          <AlertCircle size={18} color="#ef4444" />
          <span>{error}</span>
        </div>
      )}

      {createSuccessMsg && (
        <div style={styles.successAlert} className="animate-fade-in">
          <CheckCircle2 size={18} color="#10b981" />
          <span>{createSuccessMsg}</span>
        </div>
      )}

      {/* Grid: Create Preview + Upload Frontend Build */}
      <div style={styles.gridTwoCol}>
        {/* Create Preview Card */}
        <div className="glass-panel" style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={styles.iconCircle}>
              <PlusCircle size={20} color="#38bdf8" />
            </div>
            <div>
              <h3 style={styles.cardTitle}>Create Preview Environment</h3>
              <p style={styles.cardSubtitle}>Provisions ECS Fargate service, ALB listener rules & Kafka topics</p>
            </div>
          </div>

          <form onSubmit={handleCreatePreview} style={styles.form}>
            <div>
              <label style={styles.label}>Preview Name</label>
              <input
                type="text"
                placeholder="e.g. alice-feat-checkout"
                value={newPreviewName}
                onChange={(e) => setNewPreviewName(e.target.value)}
                style={styles.input}
                disabled={creating}
                required
              />
              <span style={styles.inputHelp}>Used in URL path: /preview/{newPreviewName || '{name}'}/</span>
            </div>

            <div>
              <label style={styles.label}>Backend Container Tag (ECR)</label>
              <input
                type="text"
                placeholder="node-backend"
                value={imageTag}
                onChange={(e) => setImageTag(e.target.value)}
                style={styles.input}
                disabled={creating}
              />
              <span style={styles.inputHelp}>Default: node-backend (serves random API)</span>
            </div>

            <button 
              type="submit" 
              className="button button-primary"
              disabled={creating || !newPreviewName.trim()}
              style={styles.actionBtn}
            >
              {creating ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Provisioning Infrastructure...</span>
                </>
              ) : (
                <>
                  <Rocket size={16} />
                  <span>Create Preview Environment</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Upload Frontend Build Card */}
        <div className="glass-panel" style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={styles.iconCircle}>
              <UploadCloud size={20} color="#38bdf8" />
            </div>
            <div>
              <h3 style={styles.cardTitle}>Deploy React Build to Preview</h3>
              <p style={styles.cardSubtitle}>Uploads build ZIP, unzips to S3 /preview/{'{name}'}/</p>
            </div>
          </div>

          <div style={styles.form}>
            <div>
              <label style={styles.label}>Target Preview Environment</label>
              <select
                value={selectedPreviewForUpload}
                onChange={(e) => setSelectedPreviewForUpload(e.target.value)}
                style={styles.select}
                disabled={uploading}
              >
                <option value="">-- Select or enter preview --</option>
                {previews.map(p => (
                  <option key={p.previewName} value={p.previewName}>
                    {p.previewName} ({p.status})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={styles.label}>React Build ZIP (e.g. dist.zip or react-app.zip)</label>
              <input
                type="file"
                accept=".zip"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                style={styles.fileInput}
                disabled={uploading}
              />
            </div>

            {uploading && (
              <div style={styles.progressContainer}>
                <div style={styles.progressBar}>
                  <div style={{ ...styles.progressFill, width: `${uploadProgress}%` }} />
                </div>
                <span style={styles.progressText}>Uploading & unzipping... {uploadProgress}%</span>
              </div>
            )}

            <button
              onClick={handleFileUpload}
              className="button button-primary"
              disabled={uploading || !uploadFile || !selectedPreviewForUpload}
              style={styles.actionBtn}
            >
              {uploading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Deploying Frontend...</span>
                </>
              ) : (
                <>
                  <UploadCloud size={16} />
                  <span>Upload & Deploy to Preview</span>
                </>
              )}
            </button>

            {uploadSuccessUrl && (
              <div style={styles.deploySuccessCard} className="animate-fade-in">
                <CheckCircle2 size={20} color="#10b981" />
                <div>
                  <div style={{ fontWeight: 600, color: '#10b981' }}>Frontend Deployed Successfully!</div>
                  <a 
                    href={uploadSuccessUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={styles.launchLink}
                  >
                    <span>Open Preview: {uploadSuccessUrl}</span>
                    <ExternalLink size={14} />
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Active Previews List */}
      <div className="glass-panel" style={styles.previewsPanel}>
        <div style={styles.panelHeaderRow}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Server size={22} color="#38bdf8" />
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Active Preview Environments</h3>
          </div>
          <span style={styles.liveIndicator}>
            <Activity size={12} className="animate-pulse" color="#10b981" />
            <span>Live Sync</span>
          </span>
        </div>

        {previews.length === 0 ? (
          <div style={styles.emptyState}>
            <Server size={40} color="#475569" />
            <p style={{ marginTop: '12px', color: '#94a3b8' }}>No preview environments currently running.</p>
            <p style={{ fontSize: '13px', color: '#64748b' }}>Create one above to spin up a full-stack preview environment.</p>
          </div>
        ) : (
          <div style={styles.previewGrid}>
            {previews.map((preview) => {
              const isCreating = preview.status === 'CREATING';
              const isActive = preview.status === 'ACTIVE';
              const isFailed = preview.status === 'FAILED';
              const isDestroying = preview.status === 'DESTROYING';
              const isError = isFailed || preview.status === 'ERROR';

              return (
                <div key={preview.previewName} style={styles.previewCard} className="animate-fade-in">
                  <div style={styles.previewCardTop}>
                    <div>
                      <div style={styles.previewName}>{preview.previewName}</div>
                      <div style={styles.metaRow}>
                        <Clock size={12} />
                        <span>{formatTtl(preview.ttl)}</span>
                      </div>
                    </div>
                    <span style={{
                      ...styles.statusBadge,
                      backgroundColor: isActive ? 'rgba(16, 185, 129, 0.15)' : isCreating ? 'rgba(56, 189, 248, 0.15)' : isError ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                      color: isActive ? '#10b981' : isCreating ? '#38bdf8' : isError ? '#ef4444' : '#f59e0b',
                      border: `1px solid ${isActive ? 'rgba(16, 185, 129, 0.3)' : isCreating ? 'rgba(56, 189, 248, 0.3)' : isError ? 'rgba(239, 68, 68, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`
                    }}>
                      {isCreating && <Loader2 size={12} className="animate-spin" />}
                      {preview.status}
                    </span>
                  </div>

                  <div style={styles.previewUrls}>
                    <div style={styles.urlItem}>
                      <Globe size={14} color="#38bdf8" />
                      <span style={{ color: '#94a3b8' }}>Frontend:</span>
                      <a 
                        href={preview.previewUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={styles.urlLink}
                      >
                        {preview.previewUrl}
                        <ExternalLink size={12} />
                      </a>
                    </div>
                    <div style={styles.urlItem}>
                      <Terminal size={14} color="#a855f7" />
                      <span style={{ color: '#94a3b8' }}>API Routing:</span>
                      <code style={styles.headerCode}>X-Preview-Env: {preview.previewName}</code>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={styles.cardActions}>
                    <a
                      href={preview.previewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="button button-primary"
                      style={{ ...styles.cardBtn, textDecoration: 'none' }}
                    >
                      <ExternalLink size={14} />
                      <span>Open Preview</span>
                    </a>

                    <button
                      onClick={() => handleTestApi(preview.previewName)}
                      className="button button-secondary"
                      style={styles.cardBtn}
                      disabled={testingApi === preview.previewName}
                    >
                      {testingApi === preview.previewName ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Code2 size={14} />
                      )}
                      <span>Test Backend API</span>
                    </button>

                    <button
                      onClick={() => handleDestroyPreview(preview.previewName)}
                      className="button button-secondary"
                      style={{ ...styles.cardBtn, borderColor: 'rgba(239, 68, 68, 0.3)', color: '#ef4444' }}
                      disabled={isDestroying}
                    >
                      <Trash2 size={14} />
                      <span>Destroy</span>
                    </button>
                  </div>

                  {/* Live API test output box */}
                  {testResult && testResult.previewName === preview.previewName && (
                    <div style={styles.apiTestBox} className="animate-fade-in">
                      <div style={styles.apiTestHeader}>
                        <span style={{ fontWeight: 600 }}>Response from Node.js Preview Backend:</span>
                        <button 
                          onClick={() => setTestResult(null)}
                          style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                        >
                          ✕
                        </button>
                      </div>
                      <pre style={styles.codePre}>
                        {JSON.stringify(testResult.data, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '24px',
    margin: '20px 0 40px 0'
  },
  topHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap' as const,
    gap: '16px'
  },
  titleBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '4px 10px',
    borderRadius: '12px',
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    color: '#38bdf8',
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '0.05em',
    marginBottom: '8px'
  },
  mainHeading: {
    margin: 0,
    fontSize: '24px',
    fontWeight: 700,
    letterSpacing: '-0.02em',
    color: '#f8fafc'
  },
  subHeading: {
    margin: '6px 0 0 0',
    color: '#94a3b8',
    fontSize: '14px'
  },
  statsCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '12px 20px',
    background: 'rgba(30, 41, 59, 0.7)',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.08)'
  },
  slotCount: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '4px'
  },
  refreshBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 14px',
    fontSize: '13px'
  },
  gridTwoCol: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
    gap: '24px'
  },
  card: {
    padding: '28px',
    borderRadius: '16px',
    background: 'rgba(30, 41, 59, 0.5)',
    border: '1px solid rgba(255, 255, 255, 0.08)'
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '20px'
  },
  iconCircle: {
    width: '42px',
    height: '42px',
    borderRadius: '10px',
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid rgba(56, 189, 248, 0.2)'
  },
  cardTitle: {
    margin: 0,
    fontSize: '17px',
    fontWeight: 600,
    color: '#f8fafc'
  },
  cardSubtitle: {
    margin: '2px 0 0 0',
    fontSize: '12px',
    color: '#94a3b8'
  },
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px'
  },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: 500,
    color: '#e2e8f0',
    marginBottom: '6px'
  },
  input: {
    width: '100%',
    padding: '10px 14px',
    borderRadius: '8px',
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    color: '#f8fafc',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box' as const
  },
  select: {
    width: '100%',
    padding: '10px 14px',
    borderRadius: '8px',
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    color: '#f8fafc',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box' as const
  },
  fileInput: {
    width: '100%',
    padding: '8px 12px',
    borderRadius: '8px',
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    border: '1px dashed rgba(255, 255, 255, 0.2)',
    color: '#94a3b8',
    fontSize: '13px',
    boxSizing: 'border-box' as const
  },
  inputHelp: {
    display: 'block',
    fontSize: '11px',
    color: '#64748b',
    marginTop: '4px'
  },
  actionBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '12px',
    marginTop: '8px',
    fontSize: '14px',
    fontWeight: 600
  },
  previewsPanel: {
    padding: '28px',
    borderRadius: '16px',
    background: 'rgba(30, 41, 59, 0.5)',
    border: '1px solid rgba(255, 255, 255, 0.08)'
  },
  panelHeaderRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px'
  },
  liveIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
    color: '#10b981',
    fontWeight: 600
  },
  emptyState: {
    padding: '48px',
    textAlign: 'center' as const,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center'
  },
  previewGrid: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px'
  },
  previewCard: {
    padding: '20px',
    borderRadius: '12px',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '14px'
  },
  previewCardTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  previewName: {
    fontSize: '17px',
    fontWeight: 700,
    color: '#f8fafc'
  },
  metaRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
    color: '#94a3b8',
    marginTop: '4px'
  },
  statusBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 10px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 600
  },
  previewUrls: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
    fontSize: '13px'
  },
  urlItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap' as const
  },
  urlLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    color: '#38bdf8',
    textDecoration: 'none',
    fontWeight: 500
  },
  headerCode: {
    padding: '2px 8px',
    borderRadius: '4px',
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
    border: '1px solid rgba(168, 85, 247, 0.25)',
    color: '#c084fc',
    fontSize: '12px',
    fontFamily: 'monospace'
  },
  cardActions: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap' as const,
    paddingTop: '8px',
    borderTop: '1px solid rgba(255, 255, 255, 0.05)'
  },
  cardBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 14px',
    fontSize: '13px'
  },
  errorAlert: {
    padding: '12px 16px',
    borderRadius: '10px',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    color: '#ef4444',
    fontSize: '13px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  successAlert: {
    padding: '12px 16px',
    borderRadius: '10px',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    border: '1px solid rgba(16, 185, 129, 0.2)',
    color: '#10b981',
    fontSize: '13px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  deploySuccessCard: {
    padding: '16px',
    borderRadius: '10px',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    border: '1px solid rgba(16, 185, 129, 0.2)',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px'
  },
  launchLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    color: '#38bdf8',
    marginTop: '6px',
    fontSize: '13px',
    fontWeight: 600
  },
  progressContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px'
  },
  progressBar: {
    height: '6px',
    borderRadius: '3px',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#38bdf8',
    transition: 'width 0.3s ease'
  },
  progressText: {
    fontSize: '12px',
    color: '#94a3b8'
  },
  apiTestBox: {
    marginTop: '10px',
    padding: '14px',
    borderRadius: '10px',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    border: '1px solid rgba(255, 255, 255, 0.1)'
  },
  apiTestHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '12px',
    color: '#38bdf8',
    marginBottom: '8px'
  },
  codePre: {
    margin: 0,
    fontSize: '12px',
    fontFamily: 'monospace',
    color: '#a5f3fc',
    whiteSpace: 'pre-wrap' as const,
    wordBreak: 'break-all' as const
  }
};
