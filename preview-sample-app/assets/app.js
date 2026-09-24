const { useState, useEffect } = React;
const e = React.createElement;

function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  
  // Extract preview name from path: /preview/{name}/...
  const match = window.location.pathname.match(/\/preview\/([^\/]+)/);
  const detectedPreview = match ? match[1] : 'alice-test';

  const [previewEnv, setPreviewEnv] = useState(detectedPreview);
  const [previewData, setPreviewData] = useState(null);
  const [baselineData, setBaselineData] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingBaseline, setLoadingBaseline] = useState(false);

  // Auto-fetch on mount
  useEffect(() => {
    callPreviewApi();
    callBaselineApi();
  }, [previewEnv]);

  const callPreviewApi = async () => {
    setLoadingPreview(true);
    try {
      const res = await fetch('/api/random', {
        headers: {
          'X-Preview-Env': previewEnv
        }
      });
      const data = await res.json();
      setPreviewData(data);
    } catch (err) {
      setPreviewData({ error: err.message, note: 'Ensure ALB rule is active and ECS task is healthy' });
    } finally {
      setLoadingPreview(false);
    }
  };

  const callBaselineApi = async () => {
    setLoadingBaseline(true);
    try {
      const res = await fetch('/api/random');
      const data = await res.json();
      setBaselineData(data);
    } catch (err) {
      setBaselineData({ error: err.message });
    } finally {
      setLoadingBaseline(false);
    }
  };

  return e('div', { className: 'container' },
    // Header
    e('div', { className: 'header' },
      e('div', { className: 'badge' }, 'FULL-STACK PREVIEW ACTIVE'),
      e('h1', null, 'React Frontend on Preview Path'),
      e('p', null,
        'You are viewing a static React build hosted on S3 and served directly by the AWS Application Load Balancer at ',
        e('code', null, currentPath)
      ),
      e('div', { style: { marginTop: '16px', display: 'flex', gap: '16px', flexWrap: 'wrap' } },
        e('div', { className: 'status-row' },
          e('span', { className: 'status-label', style: { marginRight: '8px' } }, 'Active Preview:'),
          e('span', { className: 'status-val tag-preview' }, previewEnv)
        ),
        e('div', { className: 'status-row' },
          e('span', { className: 'status-label', style: { marginRight: '8px' } }, 'Backend Protocol:'),
          e('span', { className: 'status-val' }, 'HTTP + MSK Serverless')
        )
      )
    ),

    // Grid Cards
    e('div', { className: 'grid' },
      // Preview Backend Test Card
      e('div', { className: 'card' },
        e('div', { className: 'card-title' },
          e('span', null, 'Preview Backend Route'),
          e('span', { className: 'tag-preview' }, `X-Preview-Env: ${previewEnv}`)
        ),
        e('p', { style: { marginBottom: '14px' } },
          'Sends request to ',
          e('code', null, '/api/random'),
          ' with ',
          e('code', null, `X-Preview-Env: ${previewEnv}`),
          ' header. ALB routes this to your preview\'s isolated ECS service!'
        ),
        e('button', {
          className: 'button',
          onClick: callPreviewApi,
          disabled: loadingPreview
        }, loadingPreview ? 'Fetching...' : 'Call Preview Backend'),
        e('div', { className: 'response-box' },
          previewData ? JSON.stringify(previewData, null, 2) : '// Click button to test'
        )
      ),

      // Baseline Backend Test Card
      e('div', { className: 'card' },
        e('div', { className: 'card-title' },
          e('span', null, 'Baseline Backend Route'),
          e('span', { className: 'tag-baseline' }, 'Default (No Header)')
        ),
        e('p', { style: { marginBottom: '14px' } },
          'Sends request to ',
          e('code', null, '/api/random'),
          ' without header. ALB routes this to the baseline ECS service!'
        ),
        e('button', {
          className: 'button button-secondary',
          onClick: callBaselineApi,
          disabled: loadingBaseline
        }, loadingBaseline ? 'Fetching...' : 'Call Baseline Backend'),
        e('div', { className: 'response-box' },
          baselineData ? JSON.stringify(baselineData, null, 2) : '// Click button to test'
        )
      )
    ),

    // Routing explanation
    e('div', { className: 'card' },
      e('div', { className: 'card-title' }, 'How Header-Based Routing Works'),
      e('p', { style: { marginBottom: '10px' } },
        e('strong', null, '1. Frontend Isolation: '),
        'S3 path prefix ',
        e('code', null, `/preview/${previewEnv}/`),
        ' houses all React distribution files.'
      ),
      e('p', { style: { marginBottom: '10px' } },
        e('strong', null, '2. Backend Isolation: '),
        'The Axios/Fetch HTTP client automatically attaches the ',
        e('code', null, 'X-Preview-Env'),
        ' header.'
      ),
      e('p', { style: { marginBottom: '10px' } },
        e('strong', null, '3. ALB Routing: '),
        'The Main ALB matches ',
        e('code', null, `Path: /api/* + X-Preview-Env: ${previewEnv}`),
        ' (Priority 10..89) and forwards to this preview\'s ECS Target Group.'
      ),
      e('p', null,
        e('strong', null, '4. MSK Serverless: '),
        'Microservice messages use prefixed topic ',
        e('code', null, `preview-${previewEnv}-events`),
        '.'
      )
    )
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(e(App));
