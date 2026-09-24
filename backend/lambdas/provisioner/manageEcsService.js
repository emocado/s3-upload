const { ECSClient, CreateServiceCommand, UpdateServiceCommand, DeleteServiceCommand, DescribeServicesCommand } = require('@aws-sdk/client-ecs');

const ecs = new ECSClient({ region: process.env.AWS_REGION || 'ap-southeast-1' });

exports.handler = async (event) => {
  console.log('[ManageEcsService] Event:', JSON.stringify(event));
  const { action, previewName, clusterArn, taskDefArn, targetGroupArn, serviceName } = event;
  const cluster = clusterArn || process.env.ECS_CLUSTER_NAME;

  if (action === 'delete') {
    const targetService = serviceName || `prv-${previewName.replace(/[^a-zA-Z0-9-]/g, '').substring(0, 24)}`;
    try {
      console.log(`[ManageEcsService] Scaling down service ${targetService} to desiredCount=0`);
      await ecs.send(new UpdateServiceCommand({
        cluster,
        service: targetService,
        desiredCount: 0
      }));
    } catch (err) {
      console.warn(`[ManageEcsService] Warning on scale down: ${err.message}`);
    }

    try {
      console.log(`[ManageEcsService] Deleting service ${targetService}`);
      await ecs.send(new DeleteServiceCommand({
        cluster,
        service: targetService,
        force: true
      }));
    } catch (err) {
      console.warn(`[ManageEcsService] Warning on delete: ${err.message}`);
    }

    return { success: true };
  }

  // Create ECS service
  const cleanName = previewName.replace(/[^a-zA-Z0-9-]/g, '').substring(0, 24);
  const svcName = `prv-${cleanName}`;
  const subnetIds = (process.env.SUBNET_IDS || '').split(',').filter(Boolean);
  const securityGroupIds = (process.env.ECS_SECURITY_GROUP_IDS || '').split(',').filter(Boolean);

  const res = await ecs.send(new CreateServiceCommand({
    cluster,
    serviceName: svcName,
    taskDefinition: taskDefArn,
    desiredCount: 1,
    launchType: 'FARGATE',
    networkConfiguration: {
      awsvpcConfiguration: {
        subnets: subnetIds,
        securityGroups: securityGroupIds,
        assignPublicIp: 'ENABLED'
      }
    },
    loadBalancers: [
      {
        targetGroupArn: targetGroupArn,
        containerName: 'app',
        containerPort: 3000
      }
    ],
    tags: [
      { key: 'PreviewEnv', value: previewName },
      { key: 'ManagedBy', value: 'PreviewProvisioner' }
    ]
  }));

  const createdServiceArn = res.service.serviceArn;
  console.log(`[ManageEcsService] Created service: ${createdServiceArn}`);

  return {
    ...event,
    serviceArn: createdServiceArn,
    serviceName: svcName
  };
};
