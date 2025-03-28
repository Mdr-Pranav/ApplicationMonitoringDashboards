# Application Monitoring Dashboards

This project implements a Log Analytics Platform that collects, processes, and visualizes log data in real-time using Grafana, Kafka, and a REST API.

## Project Structure

```
.
├── api/                    # REST API server
├── docker/                 # Docker configuration files
├── kafka/                  # Kafka producers and consumers
├── scripts/               # Load testing and utility scripts
└── docker-compose.yml     # Main docker compose file
```

## Prerequisites

- Docker and Docker Compose
- Node.js (for API server)
- Python (for testing scripts)

## Quick Start

1. Clone the repository
2. Run `docker-compose up -d`
3. Access Grafana at http://localhost:3000
4. Access API at http://localhost:8080

## Components

- REST API Server: Node.js Express server with multiple endpoints
- Apache Kafka: Message broker for log ingestion
- PostgreSQL: Database for log storage
- Grafana: Visualization and dashboards

## Development

Check individual component directories for specific setup instructions.
