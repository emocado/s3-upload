const { ECSClient, ListServicesCommand, DescribeServicesCommand } = require('@aws-sdk/client-ecs');
const { ECRClient, DescribeImagesCommand } = require('@aws-sdk/client-ecr');

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
const ecrClient = new ECRClient({ region: process.env.AWS_REGION || 'us-east-1' });
const CLUSTER = process.env.CLUSTER_NAME;

/**
 * Lambda for: getServicesStatus
 * Fetches all services in the cluster and then gets the latest 5 image tags for each.
 */
exports.handler = async () => {
  if (!CLUSTER) {
    return formatError(400, 'CLUSTER_NAME environment variable is not set');
  }

  try {
    // 1. List all service ARNs in the cluster
    const listCmd = new ListServicesCommand({ cluster: CLUSTER });
    const { serviceArns } = await ecsClient.send(listCmd);

    if (!serviceArns || serviceArns.length === 0) {
      return formatResponse(200, []);
    }

    // 2. Describe services to get names and status
    const describeCmd = new DescribeServicesCommand({ cluster: CLUSTER, services: serviceArns });
    const { services } = await ecsClient.send(describeCmd);

    // 3. For each service, gather info and latest ECR tags
    const result = await Promise.all(services.map(async (svc) => {
      const serviceName = svc.serviceName;
      
      // Determine service status
      let status = 'STOPPED';
      if (svc.runningCount > 0) status = 'RUNNING';
      else if (svc.desiredCount > 0) status = 'PENDING';

      // Attempt to get latest 5 images from ECR
      // Note: This logic assumes the repositoryName is derived from the serviceName or part of the task definition.
      // For simplicity in this common pattern, we'll try to find a repository with the same name as the service.
      let images = [];
      try {
        const ecrResponse = await ecrClient.send(new DescribeImagesCommand({
          repositoryName: serviceName, // Assumed mapping: service-name == repo-name
          maxResults: 5,
          filter: { tagStatus: 'TAGGED' }
        }));
        
        images = ecrResponse.imageDetails
          .sort((a, b) => new Date(b.imagePushedAt) - new Date(a.imagePushedAt))
          .map(img => ({
            tag: img.imageTags[0] || 'untagged',
            pushedAt: img.imagePushedAt.toISOString()
          }))
          .slice(0, 5);
      } catch (ecrErr) {
        console.warn(`Could not fetch ECR images for ${serviceName}: ${ecrErr.message}`);
        // If repo not found, return empty images rather than crashing the whole list
      }

      return {
        serviceName,
        status,
        images
      };
    }));

    return formatResponse(200, result);
  } catch (err) {
    return formatError(500, 'Failed to fetch services status', err);
  }
};
