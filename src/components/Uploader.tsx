import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, CheckCircle2, FileArchive, Info, Folder, Terminal, ArrowRight, ChevronDown } from 'lucide-react';
import { getPresignedUrl, uploadToS3 } from '../services/api';

const MANAGERS = Array.from({ length: 8 }, (_, i) => `manager-${i + 1}`);
const FOLDERS = ['filestore', ...MANAGERS];

export const Uploader: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<string>(FOLDERS[0]);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [progress, setProgress] = useState(0);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setStatus('idle');
      setProgress(0);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1
  });

  const handleUpload = async () => {
    if (!file) return;
    setStatus('uploading');

    try {
      const { uploadUrl } = await getPresignedUrl(file.name, selectedFolder);
      await uploadToS3(uploadUrl, file, (pct) => {
        setProgress(pct);
      });
      setStatus('success');
    } catch (error) {
      setStatus('error');
    }
  };

  return (
    <div style={styles.outerContainer}>
      {/* Instructions Section */}
      <div className="glass-panel" style={styles.instructionsPanel}>
        <div style={styles.headerRow}>
          <div style={styles.iconCircle}>
            <Info size={20} color="var(--accent-primary)" />
          </div>
          <h2 style={styles.panelTitle}>Deployment Guide</h2>
        </div>

        <div style={styles.instructionSteps}>
          <div style={styles.step}>
            <div style={styles.stepNumber}>1</div>
            <div>
              <p style={styles.stepText}>Navigate to the backend repository root and execute the build script.</p>
              <div style={styles.codeBlock}>
                <Terminal size={14} style={{ marginRight: '8px', opacity: 0.7 }} />
                <code>./docker-build.sh</code>
              </div>
            </div>
          </div>

          <div style={styles.step}>
            <div style={styles.stepNumber}>2</div>
            <p style={styles.stepText}>Follow the prompts to select your target <strong>Environment</strong> and <strong>Manager</strong>.</p>
          </div>

          <div style={styles.step}>
            <div style={styles.stepNumber}>3</div>
            <p style={styles.stepText}>The script will run <code>bootJar</code> and <code>docker build</code>, outputting the image to <code>build/{"{env}"}/</code>.</p>
          </div>

          <div style={styles.step}>
            <div style={styles.stepNumber}>4</div>
            <p style={styles.stepText}>Select the target folder below and upload your <code>.tar</code> file to trigger deployment.</p>
          </div>
        </div>

        <div style={styles.infoBadge}>
          <Folder size={14} style={{ marginRight: '6px' }} />
          <span>Use <strong>filestore</strong> for general storage purposes.</span>
        </div>
      </div>

      {/* Uploader Section */}
      <div className="glass-panel" style={styles.uploaderPanel}>
        <div style={styles.headerRow}>
          <div style={styles.iconCircle}>
            <UploadCloud size={20} color="var(--accent-primary)" />
          </div>
          <h2 style={styles.panelTitle}>Upload to S3</h2>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Target Folder</label>
          <div style={styles.selectWrapper}>
            <select
              value={selectedFolder}
              onChange={(e) => setSelectedFolder(e.target.value)}
              className="custom-select"
            >
              {FOLDERS.map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
            <ChevronDown size={16} style={styles.selectIcon} />
          </div>
        </div>

        {!file || status === 'success' ? (
          <div
            {...getRootProps()}
            style={{
              ...styles.dropzone,
              borderColor: isDragActive ? 'var(--accent-primary)' : 'var(--border-subtle)',
              backgroundColor: isDragActive ? 'rgba(59, 130, 246, 0.05)' : 'rgba(0,0,0,0.1)',
            }}
          >
            <input {...getInputProps()} />
            <div style={styles.dropzoneContent}>
              <div style={styles.uploadIconWrapper}>
                <UploadCloud size={32} color="var(--accent-primary)" />
              </div>
              <p style={styles.dropText}>
                {isDragActive ? 'Drop your file here' : 'Drag & drop your artifact or click to browse'}
              </p>
              <p style={styles.dropSubtext}>Supports .tar, .zip, and any deployment assets</p>
            </div>
          </div>
        ) : (
          <div style={styles.fileCard}>
            <div style={styles.fileInfo}>
              <div style={styles.fileIconWrapper}>
                <FileArchive size={24} color="var(--accent-primary)" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={styles.fileName}>{file.name}</div>
                <div style={styles.fileSize}>
                  {(file.size / (1024 * 1024)).toFixed(2)} MB • Uploading to <strong>{selectedFolder}</strong>
                </div>
              </div>
            </div>

            {status === 'idle' && (
              <button className="button button-primary" onClick={handleUpload} style={styles.uploadButton}>
                <span>Initiate Upload</span>
                <ArrowRight size={16} />
              </button>
            )}

            {status === 'uploading' && (
              <div style={styles.progressContainer}>
                <div style={styles.progressHeader}>
                  <span style={styles.progressText}>Pushing to S3...</span>
                  <span style={styles.progressText}>{progress}%</span>
                </div>
                <div style={styles.progressBarBg}>
                  <div style={{ ...styles.progressBarFill, width: `${progress}%` }} />
                </div>
              </div>
            )}

            {status === 'error' && (
              <div style={styles.errorMessage}>
                <Info size={16} />
                <span>Upload failed. Please check your connection and try again.</span>
              </div>
            )}
          </div>
        )}

        {status === 'success' && (
          <div style={styles.successMessage} className="animate-fade-in">
            <div style={styles.successIconWrapper}>
              <CheckCircle2 color="var(--success)" size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 600 }}>Upload Successful</div>
              <div style={{ fontSize: '13px', opacity: 0.8 }}>
                File successfully placed in <code>{selectedFolder}/</code>.
                {selectedFolder !== 'filestore' && " Deployment pipeline has been triggered."}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  outerContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: '32px',
    padding: '24px 0',
  },
  instructionsPanel: {
    padding: '32px',
    background: 'rgba(255, 255, 255, 0.03)',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '24px',
  },
  uploaderPanel: {
    padding: '32px',
    background: 'rgba(255, 255, 255, 0.05)',
  },
  headerRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '8px',
  },
  iconCircle: {
    width: '40px',
    height: '40px',
    borderRadius: '12px',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid rgba(59, 130, 246, 0.2)',
  },
  panelTitle: {
    fontSize: '20px',
    fontWeight: 600,
    margin: 0,
    letterSpacing: '-0.02em',
  },
  instructionSteps: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '20px',
  },
  step: {
    display: 'flex',
    gap: '16px',
  },
  stepNumber: {
    width: '24px',
    height: '24px',
    borderRadius: '6px',
    backgroundColor: 'var(--border-subtle)',
    color: 'var(--text-secondary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: 600,
    flexShrink: 0,
    marginTop: '2px',
  },
  stepText: {
    fontSize: '14px',
    lineHeight: '1.6',
    margin: 0,
    color: 'var(--text-secondary)',
  },
  codeBlock: {
    marginTop: '10px',
    padding: '10px 14px',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: '8px',
    border: '1px solid var(--border-subtle)',
    display: 'flex',
    alignItems: 'center',
    fontFamily: 'monospace',
    fontSize: '13px',
    color: 'var(--accent-primary)',
  },
  infoBadge: {
    marginTop: 'auto',
    padding: '12px 16px',
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
    borderRadius: '10px',
    fontSize: '13px',
    color: 'var(--text-secondary)',
    display: 'flex',
    alignItems: 'center',
    border: '1px solid rgba(59, 130, 246, 0.1)',
  },
  formGroup: {
    marginBottom: '24px',
    marginTop: '16px',
  },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--text-secondary)',
    marginBottom: '8px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },
  selectWrapper: {
    position: 'relative' as const,
  },
  selectIcon: {
    position: 'absolute' as const,
    right: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    pointerEvents: 'none' as const,
    color: 'var(--text-secondary)',
  },
  dropzone: {
    border: '2px dashed var(--border-subtle)',
    borderRadius: '16px',
    padding: '40px 24px',
    textAlign: 'center' as const,
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  },
  dropzoneContent: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
  },
  uploadIconWrapper: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '20px',
  },
  dropText: {
    color: 'var(--text-primary)',
    fontSize: '16px',
    fontWeight: 500,
    margin: '0 0 8px 0',
  },
  dropSubtext: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    margin: 0,
  },
  fileCard: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    padding: '20px',
    borderRadius: '14px',
    border: '1px solid var(--border-subtle)',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '20px',
  },
  fileInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  fileIconWrapper: {
    padding: '12px',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: '10px',
  },
  fileName: {
    fontSize: '15px',
    fontWeight: 600,
    marginBottom: '4px',
  },
  fileSize: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
  },
  uploadButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    padding: '12px',
    fontSize: '15px',
    fontWeight: 600,
  },
  progressContainer: {
    width: '100%',
  },
  progressHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px',
  },
  progressText: {
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--text-secondary)',
    textTransform: 'uppercase' as const,
  },
  progressBarBg: {
    height: '8px',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    background: 'linear-gradient(90deg, var(--accent-primary), #60a5fa)',
    transition: 'width 0.3s ease',
  },
  errorMessage: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    color: 'var(--danger)',
    fontSize: '14px',
    padding: '12px',
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
    borderRadius: '8px',
  },
  successMessage: {
    marginTop: '24px',
    padding: '20px',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    border: '1px solid rgba(16, 185, 129, 0.2)',
    borderRadius: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    color: 'var(--success)',
  },
  successIconWrapper: {
    padding: '10px',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderRadius: '10px',
  }
};
