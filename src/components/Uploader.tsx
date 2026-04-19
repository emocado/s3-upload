import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, CheckCircle2, FileArchive } from 'lucide-react';
import { getPresignedUrl, uploadToS3 } from '../services/api';

export const Uploader: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
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
      const { uploadUrl } = await getPresignedUrl(file.name);
      await uploadToS3(uploadUrl, file, (pct) => {
        setProgress(pct);
      });
      setStatus('success');
    } catch (error) {
      setStatus('error');
    }
  };

  return (
    <div className="glass-panel" style={styles.container}>
      <h2 style={styles.title}>Upload File</h2>
      <p style={styles.subtitle}>Upload your file to S3 to trigger the deployment pipeline.</p>
      
      {!file || status === 'success' ? (
        <div 
          {...getRootProps()} 
          style={{
            ...styles.dropzone,
            borderColor: isDragActive ? 'var(--accent-primary)' : 'var(--border-subtle)',
            backgroundColor: isDragActive ? 'rgba(59, 130, 246, 0.05)' : 'rgba(0,0,0,0.2)',
          }}
        >
          <input {...getInputProps()} />
          <UploadCloud size={48} color="var(--text-secondary)" style={{ marginBottom: '16px' }} />
          {isDragActive ? (
            <p style={styles.dropText}>Drop the file here ...</p>
          ) : (
            <p style={styles.dropText}>Drag & drop a file here, or click to select</p>
          )}
        </div>
      ) : (
        <div style={styles.fileCard}>
          <div style={styles.fileInfo}>
            <FileArchive size={32} color="var(--accent-primary)" />
            <div>
              <div style={styles.fileName}>{file.name}</div>
              <div style={styles.fileSize}>{(file.size / (1024 * 1024)).toFixed(2)} MB</div>
            </div>
          </div>
          
          {status === 'idle' && (
            <button className="button button-primary" onClick={handleUpload}>
              Start Upload
            </button>
          )}

          {status === 'uploading' && (
            <div style={styles.progressContainer}>
              <div style={styles.progressHeader}>
                <span style={styles.progressText}>Uploading...</span>
                <span style={styles.progressText}>{progress}%</span>
              </div>
              <div style={styles.progressBarBg}>
                <div style={{ ...styles.progressBarFill, width: `${progress}%` }} />
              </div>
            </div>
          )}

          {status === 'error' && (
            <div style={{ color: 'var(--danger)', fontSize: '14px', marginTop: '8px' }}>
              Upload failed. Please try again.
            </div>
          )}
        </div>
      )}

      {status === 'success' && (
        <div style={styles.successMessage} className="animate-fade-in">
          <CheckCircle2 color="var(--success)" size={20} />
          <span>Upload complete! CodeBuild pipeline has been triggered.</span>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    padding: '32px',
    marginBottom: '32px',
  },
  title: {
    fontSize: '20px',
    fontWeight: 600,
    marginBottom: '8px',
  },
  subtitle: {
    color: 'var(--text-secondary)',
    fontSize: '14px',
    marginBottom: '24px',
  },
  dropzone: {
    border: '2px dashed var(--border-subtle)',
    borderRadius: 'var(--radius-md)',
    padding: '48px 24px',
    textAlign: 'center' as const,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  dropText: {
    color: 'var(--text-primary)',
    fontSize: '15px',
    fontWeight: 500,
  },
  fileCard: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    padding: '24px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border-subtle)',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '24px',
  },
  fileInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  fileName: {
    fontSize: '16px',
    fontWeight: 500,
  },
  fileSize: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    marginTop: '2px',
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
    fontSize: '13px',
    fontWeight: 500,
    color: 'var(--text-secondary)',
  },
  progressBarBg: {
    height: '6px',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 'var(--radius-full)',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: 'var(--accent-primary)',
    transition: 'width 0.2s ease',
  },
  successMessage: {
    marginTop: '24px',
    padding: '16px',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    border: '1px solid rgba(16, 185, 129, 0.2)',
    borderRadius: 'var(--radius-md)',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    color: 'var(--success)',
    fontWeight: 500,
  }
};
