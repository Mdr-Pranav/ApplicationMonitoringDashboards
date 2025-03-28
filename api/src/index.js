const express = require('express');
const cors = require('cors');
const { Kafka } = require('kafkajs');
const { Pool } = require('pg');
const winston = require('winston');

// Initialize Express app
const app = express();
const port = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json());

// Configure Winston logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// Initialize Kafka
const kafka = new Kafka({
  clientId: 'monitoring-api',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(',')
});

const producer = kafka.producer();

// Initialize PostgreSQL
const pool = new Pool({
  user: process.env.POSTGRES_USER || 'admin',
  password: process.env.POSTGRES_PASSWORD || 'admin123',
  host: process.env.POSTGRES_HOST || 'postgres',
  database: process.env.POSTGRES_DB || 'logs',
  port: 5432
});

// Middleware to log request info to Kafka
const requestLoggerMiddleware = async (req, res, next) => {
  const startTime = Date.now();
  
  // Capture the original end function
  const originalEnd = res.end;
  
  // Override the end function
  res.end = async function(...args) {
    const responseTime = Date.now() - startTime;
    const isError = res.statusCode >= 400;
    
    try {
      await producer.send({
        topic: 'api-logs',
        messages: [
          {
            value: JSON.stringify({
              endpoint: req.path,
              method: req.method,
              timestamp: new Date().toISOString(),
              responseTime: responseTime,
              statusCode: res.statusCode,
              error: isError
            })
          }
        ]
      });
      
      if (isError) {
        logger.error(`Request error: ${req.method} ${req.path} - Status: ${res.statusCode}`);
      } else {
        logger.info(`Request processed: ${req.method} ${req.path} - Status: ${res.statusCode}`);
      }
    } catch (error) {
      logger.error('Error sending log to Kafka:', error);
    }
    
    // Call the original end function
    originalEnd.apply(this, args);
  };
  
  next();
};

// Apply middleware
app.use(requestLoggerMiddleware);

// Sample endpoints for testing
app.get('/api/test', (req, res) => {
  res.json({ message: 'Test endpoint successful' });
});

// Error endpoint to simulate errors
app.get('/api/error', (req, res) => {
  res.status(500).json({ error: 'Simulated error' });
});

// Random delay endpoint to test response times
app.get('/api/delay', (req, res) => {
  const delay = Math.floor(Math.random() * 1000) + 100; // Random delay between 100-1100ms
  setTimeout(() => {
    res.json({ message: `Delayed response (${delay}ms)` });
  }, delay);
});

// Another endpoint that sometimes errors
app.get('/api/unreliable', (req, res) => {
  if (Math.random() > 0.7) { // 30% chance of error
    res.status(503).json({ error: 'Service temporarily unavailable' });
  } else {
    res.json({ message: 'Service is working' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

// Handle 404s
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Initialize connections and start server
async function startServer() {
  try {
    await producer.connect();
    logger.info('Connected to Kafka');

    await pool.query('SELECT NOW()');
    logger.info('Connected to PostgreSQL');

    app.listen(port, () => {
      logger.info(`Server is running on port ${port}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer(); 