const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
const { Upload } = require("@aws-sdk/lib-storage");
const unzipper = require("unzipper");

const s3 = new S3Client({ region: process.env.AWS_REGION || 'ap-southeast-1' });
const destinationBucket = process.env.DESTINATION_BUCKET;

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

function getMime(filename) {
  const match = filename.match(/\.[a-zA-Z0-9]+$/);
  if (!match) return 'application/octet-stream';
  return MIME_TYPES[match[0].toLowerCase()] || 'application/octet-stream';
}

exports.handler = async (event) => {
  console.log("[UnzipLambda] Event:", JSON.stringify(event));

  let bucket, zipKey, explicitPrefix;

  if (event.Records && event.Records[0]?.s3) {
    bucket = event.Records[0].s3.bucket.name;
    zipKey = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, " "));
  } else {
    bucket = event.bucket || destinationBucket;
    zipKey = event.zipKey || event.key;
    explicitPrefix = event.destinationPrefix;
  }

  const targetBucket = destinationBucket || bucket;

  if (!bucket || !zipKey) {
    console.error("[UnzipLambda] Missing bucket or zipKey");
    return { statusCode: 400, message: "Missing bucket or zipKey" };
  }

  // Determine destination prefix
  let destinationPrefix = explicitPrefix;
  if (!destinationPrefix) {
    // If zipKey is deploy/preview/alice/build.zip -> preview/alice
    // If zipKey is deploy/alice/build.zip -> preview/alice
    // If zipKey is deploy/alice.zip -> preview/alice
    const parts = zipKey.split('/');
    if (parts[0] === 'deploy') parts.shift();
    const filename = parts.pop();
    
    if (parts.length === 0) {
      // e.g. deploy/alice.zip -> preview/alice
      const nameWithoutExt = filename.replace(/\.zip$/i, '');
      destinationPrefix = `preview/${nameWithoutExt}`;
    } else if (parts[0] === 'preview') {
      destinationPrefix = parts.join('/');
    } else {
      destinationPrefix = `preview/${parts.join('/')}`;
    }
  }

  // Clean trailing/leading slashes
  destinationPrefix = destinationPrefix.replace(/^\/+|\/+$/g, '');
  console.log(`[UnzipLambda] Extracting ${zipKey} from ${bucket} to ${targetBucket}/${destinationPrefix}/`);

  // 1. Get the ZIP as a stream from S3
  const response = await s3.send(new GetObjectCommand({
    Bucket: bucket,
    Key: zipKey
  }));

  const uploadPromises = [];
  const successfulFiles = [];
  const failedFiles = [];
  let zipParseError = null;

  try {
    await new Promise((resolve, reject) => {
      response.Body.pipe(unzipper.Parse())
        .on('entry', (entry) => {
          let fileName = entry.path.replace(/\\/g, '/');
          const type = entry.type; // 'Directory' or 'File'

          // Strip top-level directory if zipped as a folder (e.g. dist/index.html or build/index.html)
          if (fileName.startsWith('dist/') || fileName.startsWith('build/')) {
            fileName = fileName.replace(/^(dist|build)\//, '');
          }

          if (type === 'File' && fileName && !fileName.endsWith('/')) {
            const contentType = getMime(fileName);
            const finalKey = `${destinationPrefix}/${fileName}`;

            const upload = new Upload({
              client: s3,
              params: {
                Bucket: targetBucket,
                Key: finalKey,
                Body: entry,
                ContentType: contentType
              }
            });

            const uploadPromise = upload.done()
              .then(() => successfulFiles.push(finalKey))
              .catch((err) => failedFiles.push({ file: finalKey, error: err.message }));

            uploadPromises.push(uploadPromise);
          } else {
            entry.autodrain();
          }
        })
        .on('finish', resolve)
        .on('error', reject);
    });
  } catch (err) {
    zipParseError = err;
    console.error("[UnzipLambda] Parse error:", err);
  }

  await Promise.all(uploadPromises);

  console.log(`[UnzipLambda] Successfully extracted ${successfulFiles.length} files. Failed: ${failedFiles.length}`);

  return {
    statusCode: zipParseError ? 500 : 200,
    message: zipParseError ? zipParseError.message : "Extraction completed",
    destinationPrefix,
    successfulCount: successfulFiles.length,
    failedCount: failedFiles.length,
    files: successfulFiles.slice(0, 10)
  };
};