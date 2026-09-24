const express = require('express');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;
const previewEnv = process.env.PREVIEW_ENV || 'baseline';
const kafkaTopicPrefix = process.env.KAFKA_TOPIC_PREFIX || '';
const mskBootstrapBrokers = process.env.MSK_BOOTSTRAP_BROKERS || 'not-configured';

app.use(cors());
app.use(express.json());

// Log every incoming request with headers for routing verification
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  const previewHeader = req.headers['x-preview-env'] || '(none)';
  console.log(`[${timestamp}] ${req.method} ${req.originalUrl} | X-Preview-Env: ${previewHeader} | Host: ${req.headers.host}`);
  next();
});

const quotes = [
  "Continuous testing unlocks fearless deployments.",
  "Preview environments turn code reviews into interactive experiences.",
  "Isolated stacks empower teams to ship faster.",
  "Vercel-style previews on AWS ECS with header-based routing.",
  "Autonomous preview environments keep baseline clean."
];

// Health check endpoint for ALB target group
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    previewEnv,
    service: 'preview-node-backend',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

// Random API endpoint requested by user
app.get(['/api/random', '/api/user-svc/random', '/api/order-svc/random'], (req, res) => {
  const randomNum = Math.floor(Math.random() * 900000) + 100000;
  const quote = quotes[Math.floor(Math.random() * quotes.length)];
  const receivedHeader = req.headers['x-preview-env'] || null;

  res.json({
    success: true,
    server: 'Node.js Preview Backend',
    previewEnv,
    receivedHeader,
    randomNumber: randomNum,
    quote,
    timestamp: new Date().toISOString(),
    kafka: {
      topicPrefix: kafkaTopicPrefix,
      configuredTopic: `${kafkaTopicPrefix}events`,
      mskBootstrapBrokers
    },
    system: {
      nodeVersion: process.version,
      memoryMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
      uptime: `${Math.floor(process.uptime())}s`
    }
  });
});

// Status & environment inspection endpoint
app.get('/api/status', (req, res) => {
  res.json({
    previewEnv,
    active: true,
    headers: req.headers,
    kafka: {
      topicPrefix: kafkaTopicPrefix,
      mskBootstrapBrokers
    },
    env: {
      PORT: port,
      PREVIEW_ENV: previewEnv,
      KAFKA_TOPIC_PREFIX: kafkaTopicPrefix,
      KAFKA_CONSUMER_GROUP_PREFIX: process.env.KAFKA_CONSUMER_GROUP_PREFIX || '',
      API_BASE_URL: process.env.API_BASE_URL || ''
    }
  });
});

// Echo API endpoint for testing service-to-service or POST
app.post('/api/echo', (req, res) => {
  res.json({
    echo: req.body,
    previewEnv,
    timestamp: new Date().toISOString()
  });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`[Node Backend] Server running on port ${port} (previewEnv: ${previewEnv})`);
  console.log(`[Node Backend] Kafka topic prefix: "${kafkaTopicPrefix}"`);
});
