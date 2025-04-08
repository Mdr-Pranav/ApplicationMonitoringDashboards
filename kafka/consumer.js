const { Kafka } = require('kafkajs');
const { Pool } = require('pg');
const winston = require('winston');

// Configure Winston logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'consumer-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'consumer-combined.log' })
  ]
});

// Initialize Kafka
const kafka = new Kafka({
  clientId: 'log-consumer',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(',')
});

const consumer = kafka.consumer({ groupId: 'log-processor' });

// Initialize PostgreSQL
const pool = new Pool({
  user: process.env.POSTGRES_USER || 'admin',
  password: process.env.POSTGRES_PASSWORD || 'admin123',
  host: process.env.POSTGRES_HOST || 'postgres',
  database: process.env.POSTGRES_DB || 'logs',
  port: 5432
});

// Define topics and their corresponding table names
const TOPICS = {
  'test-logs': 'test_logs',
  'error-logs': 'error_logs',
  'delay-logs': 'delay_logs',
  'unreliable-logs': 'unreliable_logs',
  'health-logs': 'health_logs',
  'other-logs': 'other_logs'
};

// Initialize database tables
async function initializeDatabase() {
  try {
    // Create tables for each topic
    for (const [topic, tableName] of Object.entries(TOPICS)) {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS ${tableName} (
          id SERIAL PRIMARY KEY,
          endpoint VARCHAR(255),
          method VARCHAR(10),
          timestamp TIMESTAMP,
          response_time INTEGER,
          status_code INTEGER,
          error BOOLEAN DEFAULT false,
          request_ip VARCHAR(45),
          user_agent TEXT,
          message TEXT
        )
      `);
      logger.info(`Database table ${tableName} initialized`);
    }
  } catch (error) {
    logger.error('Error initializing database:', error);
    throw error;
  }
}

// Process messages
async function processMessage(topic, message) {
  try {
    const log = JSON.parse(message.value.toString());
    const tableName = TOPICS[topic] || TOPICS['other-logs'];
    
    await pool.query(
      `INSERT INTO ${tableName} (endpoint, method, timestamp, response_time, status_code, error, request_ip, user_agent, message) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        log.endpoint, 
        log.method, 
        log.timestamp, 
        log.responseTime,
        log.statusCode || 0,
        !!log.error,
        log.requestIp || '',
        log.userAgent || '',
        log.message || ''
      ]
    );
    logger.info(`Message processed and stored in ${tableName}`);
  } catch (error) {
    logger.error(`Error processing message for topic ${topic}:`, error);
  }
}

// Start consumer
async function startConsumer() {
  try {
    await initializeDatabase();
    await consumer.connect();
    
    // Subscribe to all topics
    for (const topic of Object.keys(TOPICS)) {
      await consumer.subscribe({ topic, fromBeginning: true });
      logger.info(`Subscribed to topic: ${topic}`);
    }

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        await processMessage(topic, message);
      },
    });

    logger.info('Consumer started successfully');
  } catch (error) {
    logger.error('Error starting consumer:', error);
    process.exit(1);
  }
}

startConsumer(); 