const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const formatResponse = (statusCode, body) => {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization'
    },
    body: JSON.stringify(body),
  };
};

const formatError = (statusCode, message, error = null) => {
  console.error(`[ERROR] ${message}`, error);
  return formatResponse(statusCode, {
    message,
    error: error ? error.message : undefined
  });
};

const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
const BUCKET_NAME = process.env.S3_BUCKET;

/**
 * Lambda for: getPresignedUrl
 * Expects 'filename' in query string (GET) or body (POST)
 */
exports.handler = async (event) => {
  try {
    let filename = '';
    
    // Check query string first (GET)
    if (event.queryStringParameters && event.queryStringParameters.filename) {
      filename = event.queryStringParameters.filename;
    } else if (event.body) {
      // Fallback to body (POST)
      const body = JSON.parse(event.body);
      filename = body.filename;
    }

    if (!filename) {
      return formatError(400, 'Filename is required');
    }

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: filename,
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

    return formatResponse(200, { uploadUrl });
  } catch (err) {
    return formatError(500, 'Failed to generate presigned URL', err);
  }
};
