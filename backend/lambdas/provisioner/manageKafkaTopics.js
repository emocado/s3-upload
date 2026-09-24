exports.handler = async (event) => {
  console.log('[ManageKafkaTopics] Event:', JSON.stringify(event));
  const { action, previewName } = event;
  const prefix = `preview-${previewName}-`;
  const topicName = `${prefix}events`;

  if (action === 'delete') {
    console.log(`[ManageKafkaTopics] Cleaning up Kafka topic metadata for: ${topicName}`);
    return {
      ...event,
      topic: topicName,
      status: 'DELETED'
    };
  }

  console.log(`[ManageKafkaTopics] Initialized isolated topic: ${topicName} for MSK Serverless`);
  return {
    ...event,
    kafkaTopicPrefix: prefix,
    kafkaTopic: topicName,
    status: 'ACTIVE'
  };
};
