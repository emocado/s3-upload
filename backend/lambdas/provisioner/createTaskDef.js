const { ECSClient, DescribeTaskDefinitionCommand, RegisterTaskDefinitionCommand } = require('@aws-sdk/client-ecs');

const ecs = new ECSClient({ region: process.env.AWS_REGION || 'ap-southeast-1' });

exports.handler = async (event) => {
  console.log('[CreateTaskDef] Event:', JSON.stringify(event));
  const { previewName, imageTag, baseTaskDefArn } = event;

  if (!previewName) {
    throw new Error('previewName is required');
  }

  const baseArn = baseTaskDefArn || process.env.BASELINE_TASK_DEF_ARN;
  if (!baseArn) {
    throw new Error('baseTaskDefArn or BASELINE_TASK_DEF_ARN environment variable is required');
  }

  // 1. Describe base task definition
  const describeRes = await ecs.send(new DescribeTaskDefinitionCommand({
    taskDefinition: baseArn
  }));

  const baseDef = describeRes.taskDefinition;
  const containerDefs = (baseDef.containerDefinitions || []).map(container => {
    let image = container.image;
    if (imageTag && image.includes(':')) {
      const parts = image.split(':');
      parts.pop();
      image = `${parts.join(':')}:${imageTag}`;
    }

    // Filter out existing injected preview env vars
    const envVars = (container.environment || []).filter(e =>
      !['PREVIEW_ENV', 'KAFKA_TOPIC_PREFIX', 'KAFKA_CONSUMER_GROUP_PREFIX', 'API_BASE_URL'].includes(e.name)
    );

    const albDomain = process.env.ALB_DNS_NAME || 'localhost';
    envVars.push(
      { name: 'PREVIEW_ENV', value: previewName },
      { name: 'KAFKA_TOPIC_PREFIX', value: `preview-${previewName}-` },
      { name: 'KAFKA_CONSUMER_GROUP_PREFIX', value: `preview-${previewName}-` },
      { name: 'API_BASE_URL', value: `http://${albDomain}` }
    );

    return {
      ...container,
      image,
      environment: envVars
    };
  });

  // 2. Register new task definition
  const family = `preview-${previewName}`;
  const registerRes = await ecs.send(new RegisterTaskDefinitionCommand({
    family,
    containerDefinitions: containerDefs,
    cpu: baseDef.cpu || '256',
    memory: baseDef.memory || '512',
    networkMode: baseDef.networkMode || 'awsvpc',
    requiresCompatibilities: baseDef.requiresCompatibilities || ['FARGATE'],
    taskRoleArn: baseDef.taskRoleArn,
    executionRoleArn: baseDef.executionRoleArn
  }));

  const newTaskDefArn = registerRes.taskDefinition.taskDefinitionArn;
  console.log(`[CreateTaskDef] Registered task definition: ${newTaskDefArn}`);

  return {
    ...event,
    taskDefArn: newTaskDefArn
  };
};
