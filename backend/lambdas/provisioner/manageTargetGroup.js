const { ElasticLoadBalancingV2Client, CreateTargetGroupCommand, DeleteTargetGroupCommand } = require('@aws-sdk/client-elastic-load-balancing-v2');

const elb = new ElasticLoadBalancingV2Client({ region: process.env.AWS_REGION || 'ap-southeast-1' });

exports.handler = async (event) => {
  console.log('[ManageTargetGroup] Event:', JSON.stringify(event));
  const { action, previewName, targetGroupArn } = event;

  if (action === 'delete') {
    if (!targetGroupArn) {
      console.log('[ManageTargetGroup] No targetGroupArn provided to delete, skipping');
      return { success: true, deleted: false };
    }
    await elb.send(new DeleteTargetGroupCommand({ TargetGroupArn: targetGroupArn }));
    console.log(`[ManageTargetGroup] Deleted target group: ${targetGroupArn}`);
    return { success: true, deleted: true };
  }

  // Create target group
  // Max target group name is 32 alphanumeric and hyphens
  const cleanName = previewName.replace(/[^a-zA-Z0-9-]/g, '').substring(0, 20);
  const tgName = `prv-${cleanName}-tg`;
  const vpcId = event.vpcId || process.env.VPC_ID;

  const res = await elb.send(new CreateTargetGroupCommand({
    Name: tgName,
    Protocol: 'HTTP',
    Port: 3000,
    VpcId: vpcId,
    TargetType: 'ip',
    HealthCheckProtocol: 'HTTP',
    HealthCheckPort: '3000',
    HealthCheckPath: '/health',
    HealthCheckIntervalSeconds: 15,
    HealthCheckTimeoutSeconds: 5,
    HealthyThresholdCount: 2,
    UnhealthyThresholdCount: 3,
    Matcher: { HttpCode: '200' },
    Tags: [
      { Key: 'PreviewEnv', Value: previewName },
      { Key: 'ManagedBy', Value: 'PreviewProvisioner' }
    ]
  }));

  const createdArn = res.TargetGroups[0].TargetGroupArn;
  console.log(`[ManageTargetGroup] Created target group: ${createdArn}`);

  return {
    ...event,
    targetGroupArn: createdArn,
    targetGroupName: tgName
  };
};
