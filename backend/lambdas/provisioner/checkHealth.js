const { ElasticLoadBalancingV2Client, DescribeTargetHealthCommand } = require('@aws-sdk/client-elastic-load-balancing-v2');

const elb = new ElasticLoadBalancingV2Client({ region: process.env.AWS_REGION || 'ap-southeast-1' });

exports.handler = async (event) => {
  console.log('[CheckHealth] Event:', JSON.stringify(event));
  const { targetGroupArn } = event;

  if (!targetGroupArn) {
    throw new Error('targetGroupArn is required');
  }

  try {
    const res = await elb.send(new DescribeTargetHealthCommand({
      TargetGroupArn: targetGroupArn
    }));

    const descriptions = res.TargetHealthDescriptions || [];
    const hasTargets = descriptions.length > 0;
    const allHealthy = hasTargets && descriptions.every(d => d.TargetHealth?.State === 'healthy');

    console.log(`[CheckHealth] Targets: ${descriptions.length}, allHealthy: ${allHealthy}`);

    return {
      ...event,
      healthy: allHealthy,
      targetCount: descriptions.length,
      targetStates: descriptions.map(d => ({
        id: d.Target?.Id,
        state: d.TargetHealth?.State,
        reason: d.TargetHealth?.Reason
      }))
    };
  } catch (err) {
    console.error('[CheckHealth] Error describing target health:', err);
    return {
      ...event,
      healthy: false,
      error: err.message
    };
  }
};
