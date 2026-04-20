const { ECSClient, UpdateServiceCommand } = require('@aws-sdk/client-ecs');

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

const ecsClient = new ECSClient({ region: process.env.AWS_REGION || 'us-east-1' });
const CLUSTER = process.env.CLUSTER_NAME;

/**
 * Lambda for: restartService
 * Expects 'serviceName' in body (POST) or query string
 */
exports.handler = async (event) => {
  let serviceName = '';
  
  if (event.queryStringParameters && event.queryStringParameters.serviceName) {
    serviceName = event.queryStringParameters.serviceName;
  } else if (event.body) {
    const body = JSON.parse(event.body);
    serviceName = body.serviceName;
  }

  if (!serviceName) {
    return formatError(400, 'serviceName is required');
  }

  try {
    const command = new UpdateServiceCommand({
      cluster: CLUSTER,
      service: serviceName,
      forceNewDeployment: true
    });

    await ecsClient.send(command);

    return formatResponse(200, { 
      message: `Restart initiated for service ${serviceName} in cluster ${CLUSTER}` 
    });
  } catch (err) {
    return formatError(500, `Failed to restart service ${serviceName}`, err);
  }
};
