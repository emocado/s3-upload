const { ECSClient, RegisterTaskDefinitionCommand } = require('@aws-sdk/client-ecs');

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

/**
 * Lambda for: updateTaskDefinition
 * Expects the task definition JSON in the POST body
 */
exports.handler = async (event) => {
  if (!event.body) {
    return formatError(400, 'Request body is required');
  }

  try {
    const taskDefinitionInput = JSON.parse(event.body);

    // RegisterTaskDefinition takes most fields from an existing task definition
    // We clean up read-only fields that AWS SDK might complain about if passed back
    const allowedFields = [
      'family', 'taskRoleArn', 'executionRoleArn', 'networkMode', 
      'containerDefinitions', 'volumes', 'placementConstraints', 
      'requiresCompatibilities', 'cpu', 'memory', 'tags', 'proxyConfiguration'
    ];

    const params = {};
    allowedFields.forEach(field => {
      if (taskDefinitionInput[field]) {
        params[field] = taskDefinitionInput[field];
      }
    });

    const command = new RegisterTaskDefinitionCommand(params);
    const response = await ecsClient.send(command);

    return formatResponse(200, {
      message: 'New task definition registered successfully',
      taskDefinitionArn: response.taskDefinition.taskDefinitionArn
    });
  } catch (err) {
    return formatError(500, 'Failed to update task definition', err);
  }
};
