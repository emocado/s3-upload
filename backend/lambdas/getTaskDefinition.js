const { 
  ECSClient, 
  DescribeServicesCommand, 
  ListTaskDefinitionsCommand,
  DescribeTaskDefinitionCommand 
} = require('@aws-sdk/client-ecs');

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
 * Fetches the latest 5 versions of the task definition for the service.
 */
exports.handler = async (event) => {
  const serviceName = event.queryStringParameters?.serviceName;

  if (!serviceName) {
    return formatError(400, 'serviceName is required');
  }

  try {
    // 1. Get the current task definition ARN from the service to find the family
    const svcResponse = await ecsClient.send(new DescribeServicesCommand({
      cluster: CLUSTER,
      services: [serviceName]
    }));

    const service = svcResponse.services[0];
    if (!service) {
      return formatError(404, `Service ${serviceName} not found`);
    }

    const currentTaskArn = service.taskDefinition;
    // Task ARN format: arn:aws:ecs:region:account:task-definition/family:revision
    const family = currentTaskArn.split('/').pop().split(':')[0];

    // 2. List the latest 5 task definition ARNs for this family
    const listCmd = new ListTaskDefinitionsCommand({
      familyPrefix: family,
      sort: 'DESC',
      maxResults: 5
    });
    const { taskDefinitionArns } = await ecsClient.send(listCmd);

    if (!taskDefinitionArns || taskDefinitionArns.length === 0) {
      return formatResponse(200, []);
    }

    // 3. Describe each of the 5 ARNs to get full details
    const taskDefs = await Promise.all(taskDefinitionArns.map(async (arn) => {
      const tdResponse = await ecsClient.send(new DescribeTaskDefinitionCommand({
        taskDefinition: arn
      }));
      
      const td = tdResponse.taskDefinition;
      return {
        ...td,
        isCurrent: arn === currentTaskArn,
        registeredAt: td.registeredAt ? td.registeredAt.toISOString() : null
      };
    }));

    return formatResponse(200, taskDefs);
  } catch (err) {
    return formatError(500, `Failed to fetch task definitions for ${serviceName}`, err);
  }
};
