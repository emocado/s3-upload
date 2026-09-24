const { DynamoDBClient, ScanCommand, UpdateItemCommand } = require('@aws-sdk/client-dynamodb');
const { SFNClient, StartExecutionCommand } = require('@aws-sdk/client-sfn');

const ddb = new DynamoDBClient({ region: process.env.AWS_REGION || 'ap-southeast-1' });
const sfn = new SFNClient({ region: process.env.AWS_REGION || 'ap-southeast-1' });

const TABLE_NAME = process.env.METADATA_TABLE;
const DESTROY_SFN_ARN = process.env.DESTROY_SFN_ARN;

exports.handler = async () => {
  console.log('[Cleanup] Scanning for expired previews...');
  const now = Math.floor(Date.now() / 1000);

  const scanRes = await ddb.send(new ScanCommand({
    TableName: TABLE_NAME,
    FilterExpression: '#st = :active AND #ttl < :now',
    ExpressionAttributeNames: {
      '#st': 'status',
      '#ttl': 'ttl'
    },
    ExpressionAttributeValues: {
      ':active': { S: 'ACTIVE' },
      ':now': { N: now.toString() }
    }
  }));

  const expiredItems = scanRes.Items || [];
  console.log(`[Cleanup] Found ${expiredItems.length} expired previews`);

  const results = [];
  for (const item of expiredItems) {
    const pk = item.pk?.S;
    const previewName = item.previewName?.S;
    console.log(`[Cleanup] Triggering destroy for ${previewName} (pk: ${pk})`);

    if (DESTROY_SFN_ARN) {
      await sfn.send(new StartExecutionCommand({
        stateMachineArn: DESTROY_SFN_ARN,
        name: `cleanup-${previewName}-${Date.now()}`,
        input: JSON.stringify({
          previewName,
          ruleArn: item.ruleArn?.S,
          targetGroupArn: item.targetGroupArn?.S,
          serviceArn: item.serviceArn?.S,
          taskDefArn: item.taskDefArn?.S,
          serviceName: item.serviceName?.S
        })
      }));
    }

    results.push(previewName);
  }

  return {
    cleanedCount: results.length,
    previews: results
  };
};
