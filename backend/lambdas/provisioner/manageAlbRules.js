const { ElasticLoadBalancingV2Client, CreateRuleCommand, DeleteRuleCommand, DescribeRulesCommand } = require('@aws-sdk/client-elastic-load-balancing-v2');

const elb = new ElasticLoadBalancingV2Client({ region: process.env.AWS_REGION || 'ap-southeast-1' });

exports.handler = async (event) => {
  console.log('[ManageAlbRules] Event:', JSON.stringify(event));
  const { action, previewName, listenerArn, targetGroupArn, ruleArn } = event;
  const targetListener = listenerArn || process.env.ALB_LISTENER_ARN;

  if (action === 'delete') {
    if (!ruleArn) {
      console.log('[ManageAlbRules] No ruleArn provided to delete, skipping');
      return { success: true, deleted: false };
    }
    await elb.send(new DeleteRuleCommand({ RuleArn: ruleArn }));
    console.log(`[ManageAlbRules] Deleted rule: ${ruleArn}`);
    return { success: true, deleted: true };
  }

  // Create rule with Header + Path conditions
  // Reserved preview priority range: 10..89
  let assignedPriority = event.priority;
  if (!assignedPriority) {
    const existingRules = await elb.send(new DescribeRulesCommand({
      ListenerArn: targetListener
    }));

    const usedPriorities = new Set(
      existingRules.Rules.map(r => parseInt(r.Priority, 10)).filter(p => !isNaN(p))
    );

    // Find first free priority between 10 and 89
    for (let p = 10; p <= 89; p++) {
      if (!usedPriorities.has(p)) {
        assignedPriority = p;
        break;
      }
    }

    if (!assignedPriority) {
      throw new Error('Maximum concurrent preview ALB rule capacity reached (all priorities 10-89 in use)');
    }
  }

  const res = await elb.send(new CreateRuleCommand({
    ListenerArn: targetListener,
    Priority: assignedPriority,
    Conditions: [
      {
        Field: 'path-pattern',
        Values: ['/api/*']
      },
      {
        Field: 'http-header',
        HttpHeaderConfig: {
          HttpHeaderName: 'X-Preview-Env',
          Values: [previewName]
        }
      }
    ],
    Actions: [
      {
        Type: 'forward',
        TargetGroupArn: targetGroupArn
      }
    ],
    Tags: [
      { Key: 'PreviewEnv', Value: previewName },
      { Key: 'ManagedBy', Value: 'PreviewProvisioner' }
    ]
  }));

  const createdRuleArn = res.Rules[0].RuleArn;
  console.log(`[ManageAlbRules] Created ALB rule: ${createdRuleArn} (Priority ${assignedPriority})`);

  return {
    ...event,
    ruleArn: createdRuleArn,
    priority: assignedPriority
  };
};
