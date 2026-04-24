import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, CheckCircle2, FileArchive, Info, Folder, Terminal, ArrowRight, Loader2, X, AlertCircle } from 'lucide-react';
import { getPresignedUrl, uploadToS3 } from '../services/api';

interface FileUploadState {
  file: File;
  folder: string;
  progress: number;
  status: 'idle' | 'uploading' | 'success' | 'error';
  error?: string;
}

const getFolderForFile = (filename: string): string => {
  const match = filename.match(/manager-(\d+)/i);
  if (match) {
    const num = parseInt(match[1]);
    if (num >= 1 && num <= 8) return `manager-${num}`;
  }
  return 'filestore';
};

export const Uploader: React.FC = () => {
  const [uploads, setUploads] = useState<FileUploadState[]>([]);
  const [isOverallUploading, setIsOverallUploading] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newUploads: FileUploadState[] = acceptedFiles.map(file => ({
      file,
      folder: getFolderForFile(file.name),
      progress: 0,
      status: 'idle'
    }));
    setUploads(prev => [...prev, ...newUploads]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop
  });

  const removeFile = (index: number) => {
    if (isOverallUploading) return;
    setUploads(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (uploads.length === 0 || isOverallUploading) return;
    setIsOverallUploading(true);

    const uploadPromises = uploads.map(async (upload, index) => {
      if (upload.status === 'success') return;

      // Update status to uploading
      setUploads(prev => prev.map((u, i) => i === index ? { ...u, status: 'uploading' } : u));

      try {
        const { uploadUrl } = await getPresignedUrl(upload.file.name, upload.folder);
        await uploadToS3(uploadUrl, upload.file, (pct) => {
          setUploads(prev => prev.map((u, i) => i === index ? { ...u, progress: pct } : u));
        });
        setUploads(prev => prev.map((u, i) => i === index ? { ...u, status: 'success' } : u));
      } catch (error) {
        setUploads(prev => prev.map((u, i) => i === index ? { ...u, status: 'error', error: 'Upload failed' } : u));
      }
    });

    await Promise.all(uploadPromises);
    setIsOverallUploading(false);
  };

  const hasPendingUploads = uploads.some(u => u.status === 'idle' || u.status === 'error');
  const allSuccessful = uploads.length > 0 && uploads.every(u => u.status === 'success');

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
            <p style={styles.stepText}>Upload your <code>.tar</code> file(s) below. The uploader will automatically detect the target manager based on the filename.</p>
          </div>
        </div>

        <div style={styles.infoBadge}>
          <Folder size={14} style={{ marginRight: '6px' }} />
          <span>Files not named <code>manager-N</code> will go to <strong>filestore</strong>.</span>
        </div>
      </div>

      {/* Uploader Section */}
      <div className="glass-panel" style={styles.uploaderPanel}>
        <div style={styles.headerRow}>
          <div style={styles.iconCircle}>
            <UploadCloud size={20} color="var(--accent-primary)" />
          </div>
          <h2 style={styles.panelTitle}>Smart S3 Uploader</h2>
        </div>

        <div 
          {...getRootProps()} 
          style={{
            ...styles.dropzone,
            borderColor: isDragActive ? 'var(--accent-primary)' : 'var(--border-subtle)',
            backgroundColor: isDragActive ? 'rgba(59, 130, 246, 0.05)' : 'rgba(0,0,0,0.1)',
            marginBottom: uploads.length > 0 ? '24px' : '0'
          }}
        >
          <input {...getInputProps()} />
          <div style={styles.dropzoneContent}>
            <div style={styles.uploadIconWrapper}>
              <UploadCloud size={32} color="var(--accent-primary)" />
            </div>
            <p style={styles.dropText}>
              {isDragActive ? 'Drop your files here' : 'Drag & drop multiple files or click to browse'}
            </p>
            <p style={styles.dropSubtext}>Smart routing based on manager-{1}-8 naming convention</p>
          </div>
        </div>

        {uploads.length > 0 && (
          <div style={styles.fileList}>
            {uploads.map((upload, idx) => (
              <div key={`${upload.file.name}-${idx}`} style={styles.fileCard}>
                <div style={styles.fileInfo}>
                  <div style={styles.fileIconWrapper}>
                    <FileArchive size={20} color="var(--accent-primary)" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={styles.fileName}>{upload.file.name}</div>
                    <div style={styles.fileSize}>
                      {(upload.file.size / (1024 * 1024)).toFixed(2)} MB • Target: <strong>{upload.folder}</strong>
                    </div>
                  </div>
                  {upload.status === 'idle' && !isOverallUploading && (
                    <button style={styles.removeButton} onClick={() => removeFile(idx)}>
                      <X size={16} />
                    </button>
                  )}
                  {upload.status === 'uploading' && <Loader2 className="animate-spin" size={16} color="var(--accent-primary)" />}
                  {upload.status === 'success' && <CheckCircle2 size={18} color="var(--success)" />}
                  {upload.status === 'error' && <AlertCircle size={18} color="var(--danger)" />}
                </div>

                {upload.status === 'uploading' && (
                  <div style={styles.progressContainer}>
                    <div style={styles.progressBarBg}>
                      <div style={{ ...styles.progressBarFill, width: `${upload.progress}%` }} />
                    </div>
                  </div>
                )}
                
                {upload.status === 'error' && (
                  <div style={styles.fileErrorMessage}>{upload.error}</div>
                )}
              </div>
            ))}
          </div>
        )}

        {hasPendingUploads && (
          <button 
            className="button button-primary" 
            onClick={handleUpload} 
            disabled={isOverallUploading}
            style={styles.uploadButton}
          >
            {isOverallUploading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Uploading {uploads.filter(u => u.status === 'uploading').length} of {uploads.filter(u => u.status !== 'success').length}...</span>
              </>
            ) : (
              <>
                <span>Start Uploading {uploads.filter(u => u.status !== 'success').length} File(s)</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        )}

        {allSuccessful && (
          <div style={styles.successMessage} className="animate-fade-in">
            <div style={styles.successIconWrapper}>
              <CheckCircle2 color="var(--success)" size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 600 }}>All Uploads Completed</div>
              <div style={{ fontSize: '13px', opacity: 0.8 }}>
                All {uploads.length} files have been successfully routed to their respective S3 folders.
              </div>
              <button 
                className="link-button" 
                style={{ marginTop: '8px', fontSize: '12px' }}
                onClick={() => setUploads([])}
              >
                Clear list
              </button>
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
    marginBottom: '24px',
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
  dropzone: {
    border: '2px dashed var(--border-subtle)',
    borderRadius: '16px',
    padding: '32px 24px',
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
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '16px',
  },
  dropText: {
    color: 'var(--text-primary)',
    fontSize: '15px',
    fontWeight: 500,
    margin: '0 0 4px 0',
  },
  dropSubtext: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    margin: 0,
  },
  fileList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
    marginBottom: '24px',
    maxHeight: '400px',
    overflowY: 'auto' as const,
    paddingRight: '4px',
  },
  fileCard: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    padding: '14px',
    borderRadius: '10px',
    border: '1px solid var(--border-subtle)',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
  },
  fileInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  fileIconWrapper: {
    padding: '8px',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: '8px',
  },
  fileName: {
    fontSize: '14px',
    fontWeight: 600,
    wordBreak: 'break-all' as const,
  },
  fileSize: {
    fontSize: '11px',
    color: 'var(--text-secondary)',
    marginTop: '2px',
  },
  removeButton: {
    background: 'none',
    border: 'none',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 0.2s',
  },
  uploadButton: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    padding: '14px',
    fontSize: '15px',
    fontWeight: 600,
  },
  progressContainer: {
    width: '100%',
  },
  progressBarBg: {
    height: '4px',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: '2px',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    background: 'linear-gradient(90deg, var(--accent-primary), #60a5fa)',
    transition: 'width 0.3s ease',
  },
  fileErrorMessage: {
    fontSize: '11px',
    color: 'var(--danger)',
    marginTop: '-4px',
  },
  successMessage: {
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
