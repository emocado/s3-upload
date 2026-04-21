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
 * Lambda for: restartService (renamed logic to Manage Service)
 * Expects 'serviceName', optional 'action', and optional 'taskDefinition' in body
 * Actions: 'restart' (default), 'start', 'stop'
 */
exports.handler = async (event) => {
  let serviceName = '';
  let action = 'restart';
  let taskDefinition = null;
  
  try {
    if (event.body) {
      const body = JSON.parse(event.body);
      serviceName = body.serviceName;
      action = body.action || 'restart';
      taskDefinition = body.taskDefinition || null;
    } else if (event.queryStringParameters) {
      serviceName = event.queryStringParameters.serviceName;
      action = event.queryStringParameters.action || 'restart';
      taskDefinition = event.queryStringParameters.taskDefinition || null;
    }
  } catch (e) {
    return formatError(400, 'Invalid request body');
  }

  if (!serviceName) {
    return formatError(400, 'serviceName is required');
  }

  try {
    const updateParams = {
      cluster: CLUSTER,
      service: serviceName,
    };

    if (taskDefinition) {
      updateParams.taskDefinition = taskDefinition;
    }

    if (action === 'stop') {
      updateParams.desiredCount = 0;
    } else if (action === 'start') {
      updateParams.desiredCount = 1;
    } else if (action === 'restart') {
      updateParams.forceNewDeployment = true;
      // If restarting, we usually want at least one task running
      // updateParams.desiredCount = 1; // Optional: ensure it's not starting into a stopped state
    }

    const command = new UpdateServiceCommand(updateParams);
    await ecsClient.send(command);

    return formatResponse(200, { 
      message: `Action '${action}' initiated for service ${serviceName} in cluster ${CLUSTER}${taskDefinition ? ` with task definition ${taskDefinition}` : ''}` 
    });
  } catch (err) {
    return formatError(500, `Failed to ${action} service ${serviceName}`, err);
  }
};
