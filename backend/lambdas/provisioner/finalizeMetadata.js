const { DynamoDBClient, UpdateItemCommand } = require('@aws-sdk/client-dynamodb');

const ddb = new DynamoDBClient({ region: process.env.AWS_REGION || 'ap-southeast-1' });
const TABLE_NAME = process.env.METADATA_TABLE;

exports.handler = async (event) => {
  console.log('[FinalizeMetadata] Event:', JSON.stringify(event));
  const { previewName, taskDefArn, targetGroupArn, serviceArn, ruleArn, priority, kafkaTopic, status, errorMessage } = event;

  const finalStatus = status || 'ACTIVE';
  const albDomain = process.env.ALB_DNS_NAME || 'localhost';

  const updateExpr = [
    'SET #st = :status',
    'previewUrl = :purl',
    'apiBaseUrl = :apiurl',
    'updatedAt = :now'
  ];

  const attrNames = { '#st': 'status' };
  const attrValues = {
    ':status': { S: finalStatus },
    ':purl': { S: `http://${albDomain}/preview/${previewName}/` },
    ':apiurl': { S: `http://${albDomain}/api/` },
    ':now': { S: new Date().toISOString() }
  };

  if (taskDefArn) { updateExpr.push('taskDefArn = :td'); attrValues[':td'] = { S: taskDefArn }; }
  if (targetGroupArn) { updateExpr.push('targetGroupArn = :tg'); attrValues[':tg'] = { S: targetGroupArn }; }
  if (serviceArn) { updateExpr.push('serviceArn = :svc'); attrValues[':svc'] = { S: serviceArn }; }
  if (ruleArn) { updateExpr.push('ruleArn = :rule'); attrValues[':rule'] = { S: ruleArn }; }
  if (priority) { updateExpr.push('priority = :prio'); attrValues[':prio'] = { N: priority.toString() }; }
  if (kafkaTopic) { updateExpr.push('kafkaTopic = :kt'); attrValues[':kt'] = { S: kafkaTopic }; }
  if (errorMessage) { updateExpr.push('errorMessage = :err'); attrValues[':err'] = { S: errorMessage }; }

  await ddb.send(new UpdateItemCommand({
    TableName: TABLE_NAME,
    Key: { pk: { S: `preview-${previewName}` } },
    UpdateExpression: updateExpr.join(', '),
    ExpressionAttributeNames: attrNames,
    ExpressionAttributeValues: attrValues
  }));

  console.log(`[FinalizeMetadata] DynamoDB updated for preview-${previewName} with status: ${finalStatus}`);

  return {
    ...event,
    status: finalStatus,
    previewUrl: `http://${albDomain}/preview/${previewName}/`
  };
};
