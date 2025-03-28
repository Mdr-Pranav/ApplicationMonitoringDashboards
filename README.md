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
3. Access Grafana at http://localhost:3000 (username: admin, password: admin)
4. Access API at http://localhost:8080

## Running the Project

To start all services:

```
docker-compose up -d
```

To view the logs while running:

```
docker-compose logs -f
```

## Load Testing

To test the implementation with simulated API traffic:

1. Make sure the project is running (`docker-compose up -d`)
2. Navigate to the scripts directory:
   ```
   cd scripts
   ```
3. Install the required Python dependencies:
   ```
   pip install -r requirements.txt
   ```
4. Run the load testing script:
   ```
   python load_test.py
   ```

The load testing script will:

- Run for 300 seconds (5 minutes) by default
- Use 10 concurrent workers
- Target various endpoints with different error rates and response patterns
- Generate a mix of successful and error responses

You can observe the results in real-time in your Grafana dashboard, including:

- Request counts in the "Request Count per Endpoint" panel
- Response time patterns in the "Response Time Trends" panel
- Error counts in the "Error Count by Endpoint" panel
- Individual request details in the "Real-Time Logs" panel

## Stopping the Project

To stop all services but keep data:

```
docker-compose down
```

To stop all services and remove persistent data:

```
docker-compose down -v
```

## Viewing Dashboards

After starting the project:

1. Go to http://localhost:3000 in your browser
2. Log in using admin/admin credentials
3. The API Monitoring Dashboard will show:
   - Request Count per Endpoint
   - Response Time Trends
   - Error Count by Endpoint
   - Real-Time Logs

## Components

- REST API Server: Node.js Express server with multiple endpoints
- Apache Kafka: Message broker for log ingestion
- PostgreSQL: Database for log storage
- Grafana: Visualization and dashboards

## Development

Check individual component directories for specific setup instructions.
