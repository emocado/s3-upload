const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');

const s3 = new S3Client({ region: process.env.AWS_REGION || 'ap-southeast-1' });
const BUCKET_NAME = process.env.PREVIEW_BUCKET;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json',
  '.txt': 'text/plain'
};

const BINARY_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.ico', '.woff', '.woff2', '.ttf'];

function getContentType(path) {
  const match = path.match(/\.[a-zA-Z0-9]+$/);
  if (!match) return 'text/html; charset=utf-8';
  return MIME_TYPES[match[0].toLowerCase()] || 'application/octet-stream';
}

function isBinary(path) {
  const match = path.match(/\.[a-zA-Z0-9]+$/);
  if (!match) return false;
  return BINARY_EXTENSIONS.includes(match[0].toLowerCase());
}

async function streamToBuffer(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', chunk => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

exports.handler = async (event) => {
  const rawPath = event.path || '/';
  console.log(`[FrontendServe] Request path: ${rawPath}`);

  // Determine S3 key
  let s3Key = rawPath.startsWith('/') ? rawPath.substring(1) : rawPath;
  if (!s3Key || s3Key === '') {
    s3Key = 'index.html';
  } else if (s3Key.endsWith('/')) {
    s3Key += 'index.html';
  } else if (!s3Key.includes('.') && s3Key.startsWith('preview/')) {
    s3Key += '/index.html';
  }

  // Check if deep link under preview: /preview/{name}/some/deep/route
  const parts = rawPath.split('/').filter(Boolean);
  let previewName = null;
  if (parts[0] === 'preview' && parts[1]) {
    previewName = parts[1];
  }

  try {
    const s3Response = await s3.send(new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key
    }));

    const buffer = await streamToBuffer(s3Response.Body);
    const contentType = getContentType(s3Key);
    const binary = isBinary(s3Key);

    return {
      statusCode: 200,
      statusDescription: '200 OK',
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache, must-revalidate',
        'Access-Control-Allow-Origin': '*'
      },
      isBase64Encoded: binary,
      body: binary ? buffer.toString('base64') : buffer.toString('utf-8')
    };
  } catch (err) {
    if (err.name === 'NoSuchKey' || err.$metadata?.httpStatusCode === 404) {
      // Fallback for root / index.html if not uploaded
      if (s3Key === 'index.html' && !previewName) {
        return {
          statusCode: 200,
          statusDescription: '200 OK',
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'no-cache'
          },
          body: `<!DOCTYPE html>
<html>
<head>
  <title>Preview Environments Gateway</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
    .card { background: #1e293b; border: 1px solid #334155; padding: 40px; border-radius: 16px; max-width: 500px; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
    h1 { margin-top: 0; color: #38bdf8; }
    p { color: #94a3b8; line-height: 1.6; }
    .badge { display: inline-block; background: #0369a1; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; margin-bottom: 16px; }
    .btn { display: inline-block; background: #0284c7; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 20px; transition: background 0.2s; }
    .btn:hover { background: #0369a1; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">ALB PREVIEW GATEWAY</div>
    <h1>Preview Gateway Online</h1>
    <p>Access your preview environment frontend by appending its path:</p>
    <p><code>/preview/{preview-name}/</code></p>
    <p>To create or manage preview environments, use the UTD Website dashboard.</p>
  </div>
</body>
</html>`
        };
      }

      // SPA Fallback for /preview/{name}/*
      if (previewName && !s3Key.endsWith('index.html') && !s3Key.includes('.')) {
        try {
          const fallbackKey = `preview/${previewName}/index.html`;
          const fallbackResponse = await s3.send(new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: fallbackKey
          }));
          const buffer = await streamToBuffer(fallbackResponse.Body);
          return {
            statusCode: 200,
            statusDescription: '200 OK',
            headers: {
              'Content-Type': 'text/html; charset=utf-8',
              'Cache-Control': 'no-cache',
              'Access-Control-Allow-Origin': '*'
            },
            isBase64Encoded: false,
            body: buffer.toString('utf-8')
          };
        } catch (fallbackErr) {
          console.error(`[FrontendServe] SPA fallback failed for ${previewName}:`, fallbackErr);
        }
      }

      return {
        statusCode: 404,
        statusDescription: '404 Not Found',
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
        body: `<!DOCTYPE html><html><body style="font-family:sans-serif;text-align:center;padding:50px;background:#0f172a;color:#fff;">
          <h2>404 - Preview File Not Found</h2>
          <p>Key: <code>${s3Key}</code></p>
          <p>Please make sure you have uploaded the React build zip for preview <strong>${previewName || 'environment'}</strong>.</p>
        </body></html>`
      };
    }

    console.error(`[FrontendServe] Error fetching ${s3Key}:`, err);
    return {
      statusCode: 500,
      statusDescription: '500 Internal Error',
      headers: { 'Content-Type': 'text/plain' },
      body: `Internal Server Error: ${err.message}`
    };
  }
};
