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

// Initialize database table
async function initializeDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS api_logs (
        id SERIAL PRIMARY KEY,
        endpoint VARCHAR(255),
        method VARCHAR(10),
        timestamp TIMESTAMP,
        response_time INTEGER,
        error BOOLEAN DEFAULT false
      )
    `);
    logger.info('Database table initialized');
  } catch (error) {
    logger.error('Error initializing database:', error);
    throw error;
  }
}

// Process messages
async function processMessage(message) {
  try {
    const log = JSON.parse(message.value.toString());
    
    await pool.query(
      'INSERT INTO api_logs (endpoint, method, timestamp, response_time, error) VALUES ($1, $2, $3, $4, $5)',
      [log.endpoint, log.method, log.timestamp, log.responseTime, !!log.error]
    );
  } catch (error) {
    logger.error('Error processing message:', error);
  }
}

// Start consumer
async function startConsumer() {
  try {
    await initializeDatabase();
    await consumer.connect();
    await consumer.subscribe({ topic: 'api-logs', fromBeginning: true });

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        await processMessage(message);
      },
    });

    logger.info('Consumer started successfully');
  } catch (error) {
    logger.error('Error starting consumer:', error);
    process.exit(1);
  }
}

startConsumer(); 