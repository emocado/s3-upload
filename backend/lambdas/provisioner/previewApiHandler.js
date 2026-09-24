const { DynamoDBClient, PutItemCommand, GetItemCommand, ScanCommand, UpdateItemCommand, DeleteItemCommand } = require('@aws-sdk/client-dynamodb');
const { SFNClient, StartExecutionCommand, DescribeExecutionCommand } = require('@aws-sdk/client-sfn');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');

const ddb = new DynamoDBClient({ region: process.env.AWS_REGION || 'ap-southeast-1' });
const sfn = new SFNClient({ region: process.env.AWS_REGION || 'ap-southeast-1' });
const s3 = new S3Client({ region: process.env.AWS_REGION || 'ap-southeast-1' });
const lambda = new LambdaClient({ region: process.env.AWS_REGION || 'ap-southeast-1' });

const TABLE_NAME = process.env.METADATA_TABLE;
const CREATE_SFN_ARN = process.env.CREATE_SFN_ARN;
const DESTROY_SFN_ARN = process.env.DESTROY_SFN_ARN;
const S3_BUCKET = process.env.PREVIEW_BUCKET;
const ALB_DOMAIN = process.env.ALB_DNS_NAME;
const UNZIP_LAMBDA_NAME = process.env.UNZIP_LAMBDA_NAME;
const TTL_HOURS = parseInt(process.env.PREVIEW_TTL_HOURS || '4', 10);
const MAX_PREVIEWS = parseInt(process.env.MAX_CONCURRENT_PREVIEWS || '10', 10);

const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'OPTIONS,GET,POST,DELETE',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Preview-Env'
};

const sendJson = (statusCode, data) => ({
  statusCode,
  headers: corsHeaders,
  body: JSON.stringify(data)
});

exports.handler = async (event) => {
  console.log('[PreviewAPI] Method:', event.httpMethod, 'Path:', event.path, 'Resource:', event.resource);

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  const path = event.path || '';
  const method = event.httpMethod;

  try {
    // 1. GET /previews
    if (method === 'GET' && (path === '/previews' || event.resource === '/previews')) {
      const scanRes = await ddb.send(new ScanCommand({ TableName: TABLE_NAME }));
      const items = (scanRes.Items || []).map(item => ({
        previewName: item.previewName?.S,
        status: item.status?.S || 'UNKNOWN',
        createdAt: item.createdAt?.S,
        ttl: item.ttl?.N ? parseInt(item.ttl.N, 10) : null,
        previewUrl: `http://${ALB_DOMAIN}/preview/${item.previewName?.S}/`,
        apiBaseUrl: `http://${ALB_DOMAIN}/api/`,
        serviceArn: item.serviceArn?.S,
        targetGroupArn: item.targetGroupArn?.S,
        ruleArn: item.ruleArn?.S,
        taskDefArn: item.taskDefArn?.S,
        executionArn: item.executionArn?.S,
        errorMessage: item.errorMessage?.S
      }));

      // Sort by createdAt descending
      items.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

      return sendJson(200, {
        previews: items,
        maxCapacity: MAX_PREVIEWS,
        activeCount: items.filter(i => i.status === 'ACTIVE' || i.status === 'CREATING').length,
        albDomain: ALB_DOMAIN
      });
    }

    // 2. POST /preview - Create Preview
    if (method === 'POST' && (path === '/preview' || event.resource === '/preview')) {
      const body = JSON.parse(event.body || '{}');
      const { previewName, imageTag } = body;

      if (!previewName) {
        return sendJson(400, { error: 'previewName is required' });
      }

      // Check current active count
      const scanRes = await ddb.send(new ScanCommand({ TableName: TABLE_NAME }));
      const activePreviews = (scanRes.Items || []).filter(i => i.status?.S === 'ACTIVE' || i.status?.S === 'CREATING');
      if (activePreviews.length >= MAX_PREVIEWS) {
        return sendJson(429, { error: `Maximum concurrent preview limit reached (${MAX_PREVIEWS}). Please destroy an existing preview before creating a new one.` });
      }

      // Check if preview with this name already exists
      const existing = (scanRes.Items || []).find(i => i.previewName?.S === previewName && i.status?.S !== 'DESTROYED');
      if (existing) {
        return sendJson(409, { error: `Preview environment "${previewName}" already exists with status: ${existing.status?.S}` });
      }

      const now = Math.floor(Date.now() / 1000);
      const ttl = now + (TTL_HOURS * 3600);
      const createdAt = new Date().toISOString();

      // Put initial record in DynamoDB
      await ddb.send(new PutItemCommand({
        TableName: TABLE_NAME,
        Item: {
          pk: { S: `preview-${previewName}` },
          previewName: { S: previewName },
          status: { S: 'CREATING' },
          createdAt: { S: createdAt },
          ttl: { N: ttl.toString() },
          imageTag: { S: imageTag || 'node-backend' }
        }
      }));

      // Start Step Function execution
      const sfnInput = {
        previewName,
        imageTag: imageTag || 'node-backend',
        tableName: TABLE_NAME
      };

      const sfnRes = await sfn.send(new StartExecutionCommand({
        stateMachineArn: CREATE_SFN_ARN,
        name: `create-${previewName}-${Date.now()}`,
        input: JSON.stringify(sfnInput)
      }));

      // Update DynamoDB with execution ARN
      await ddb.send(new UpdateItemCommand({
        TableName: TABLE_NAME,
        Key: { pk: { S: `preview-${previewName}` } },
        UpdateExpression: 'SET executionArn = :arn',
        ExpressionAttributeValues: { ':arn': { S: sfnRes.executionArn } }
      }));

      return sendJson(201, {
        message: 'Preview creation initiated',
        previewName,
        executionArn: sfnRes.executionArn,
        status: 'CREATING',
        previewUrl: `http://${ALB_DOMAIN}/preview/${previewName}/`
      });
    }

    // 3. DELETE /preview/{name} - Destroy Preview
    if (method === 'DELETE' && event.pathParameters?.name) {
      const previewName = event.pathParameters.name;
      const getRes = await ddb.send(new GetItemCommand({
        TableName: TABLE_NAME,
        Key: { pk: { S: `preview-${previewName}` } }
      }));

      if (!getRes.Item) {
        return sendJson(404, { error: `Preview "${previewName}" not found` });
      }

      const item = getRes.Item;
      const destroyInput = {
        previewName,
        tableName: TABLE_NAME,
        ruleArn: item.ruleArn?.S,
        targetGroupArn: item.targetGroupArn?.S,
        serviceArn: item.serviceArn?.S,
        taskDefArn: item.taskDefArn?.S,
        serviceName: item.serviceName?.S || `prv-${previewName.replace(/[^a-zA-Z0-9-]/g, '').substring(0, 24)}`
      };

      const sfnRes = await sfn.send(new StartExecutionCommand({
        stateMachineArn: DESTROY_SFN_ARN,
        name: `destroy-${previewName}-${Date.now()}`,
        input: JSON.stringify(destroyInput)
      }));

      // Update status to DESTROYING
      await ddb.send(new UpdateItemCommand({
        TableName: TABLE_NAME,
        Key: { pk: { S: `preview-${previewName}` } },
        UpdateExpression: 'SET #st = :status, destroyExecutionArn = :darn',
        ExpressionAttributeNames: { '#st': 'status' },
        ExpressionAttributeValues: {
          ':status': { S: 'DESTROYING' },
          ':darn': { S: sfnRes.executionArn }
        }
      }));

      return sendJson(200, {
        message: `Preview "${previewName}" destruction initiated`,
        previewName,
        executionArn: sfnRes.executionArn,
        status: 'DESTROYING'
      });
    }

    // 4. GET /preview/{name}/status - Check Status
    if (method === 'GET' && event.pathParameters?.name) {
      const previewName = event.pathParameters.name;
      const getRes = await ddb.send(new GetItemCommand({
        TableName: TABLE_NAME,
        Key: { pk: { S: `preview-${previewName}` } }
      }));

      if (!getRes.Item) {
        return sendJson(404, { error: `Preview "${previewName}" not found` });
      }

      const item = getRes.Item;
      let executionStatus = null;
      const execArn = item.executionArn?.S;

      if (execArn) {
        try {
          const sfnStatus = await sfn.send(new DescribeExecutionCommand({ executionArn: execArn }));
          executionStatus = sfnStatus.status;
        } catch (e) {
          console.warn('[PreviewAPI] Could not describe execution:', e.message);
        }
      }

      return sendJson(200, {
        previewName,
        status: item.status?.S,
        executionStatus,
        createdAt: item.createdAt?.S,
        previewUrl: `http://${ALB_DOMAIN}/preview/${previewName}/`,
        apiBaseUrl: `http://${ALB_DOMAIN}/api/`,
        serviceArn: item.serviceArn?.S,
        ruleArn: item.ruleArn?.S
      });
    }

    // 5. GET /presigned-url - Upload frontend build
    if (method === 'GET' && (path.includes('/presigned-url') || event.resource === '/presigned-url')) {
      const q = event.queryStringParameters || {};
      const filename = q.filename || 'react-app.zip';
      const previewName = q.previewName || q.folder || 'default';
      
      const s3Key = `deploy/${previewName}/${filename}`;
      const command = new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: s3Key,
        ContentType: 'application/zip'
      });

      const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
      return sendJson(200, {
        uploadUrl,
        key: s3Key,
        bucket: S3_BUCKET,
        previewName,
        previewUrl: `http://${ALB_DOMAIN}/preview/${previewName}/`
      });
    }

    // 6. POST /unzip - Manually trigger unzip
    if (method === 'POST' && (path.includes('/unzip') || event.resource === '/unzip')) {
      const body = JSON.parse(event.body || '{}');
      const { zipKey, previewName } = body;

      if (!zipKey) {
        return sendJson(400, { error: 'zipKey is required' });
      }

      const invokeRes = await lambda.send(new InvokeCommand({
        FunctionName: UNZIP_LAMBDA_NAME,
        Payload: Buffer.from(JSON.stringify({
          bucket: S3_BUCKET,
          zipKey,
          destinationPrefix: previewName ? `preview/${previewName}` : undefined
        }))
      }));

      const payload = JSON.parse(Buffer.from(invokeRes.Payload).toString('utf-8'));
      return sendJson(200, {
        message: 'Unzip completed',
        details: payload,
        previewUrl: `http://${ALB_DOMAIN}/preview/${previewName}/`
      });
    }

    return sendJson(404, { error: `Route not found: ${method} ${path}` });
  } catch (err) {
    console.error('[PreviewAPI] Unhandled error:', err);
    return sendJson(500, { error: err.message });
  }
};
