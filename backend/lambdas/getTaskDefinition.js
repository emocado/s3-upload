const { ECSClient, DescribeServicesCommand, DescribeTaskDefinitionCommand } = require('@aws-sdk/client-ecs');

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
 * Lambda for: getTaskDefinition
 * Expects 'serviceName' in query string (GET)
 */
exports.handler = async (event) => {
  const serviceName = event.queryStringParameters?.serviceName;

  if (!serviceName) {
    return formatError(400, 'serviceName is required');
  }

  try {
    // 1. Get the current task definition ARN from the service
    const svcResponse = await ecsClient.send(new DescribeServicesCommand({
      cluster: CLUSTER,
      services: [serviceName]
    }));

    const service = svcResponse.services[0];
    if (!service) {
      return formatError(404, `Service ${serviceName} not found`);
    }

    const taskDefinitionArn = service.taskDefinition;

    // 2. Fetch the full task definition details
    const tdResponse = await ecsClient.send(new DescribeTaskDefinitionCommand({
      taskDefinition: taskDefinitionArn
    }));

    return formatResponse(200, tdResponse.taskDefinition);
  } catch (err) {
    return formatError(500, `Failed to fetch task definition for ${serviceName}`, err);
  }
};
