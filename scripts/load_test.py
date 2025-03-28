import requests
import time
import random
from concurrent.futures import ThreadPoolExecutor
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

# API endpoints
BASE_URL = 'http://localhost:8080'
ENDPOINTS = [
    '/api/test',
    '/api/error',
    '/api/delay',
    '/api/unreliable',
    '/health',
    '/api/nonexistent'  # Will trigger 404 error
]

# Configure weights to ensure we get a mix of successes and errors
ENDPOINT_WEIGHTS = {
    '/api/test': 30,        # Common endpoint
    '/api/error': 10,       # Always errors
    '/api/delay': 25,       # Slow responses
    '/api/unreliable': 20,  # Sometimes errors
    '/health': 10,          # Always succeeds
    '/api/nonexistent': 5   # Always 404s
}

def weighted_choice(weights_dict):
    """Select a random endpoint based on weights"""
    items = list(weights_dict.keys())
    weights = list(weights_dict.values())
    total = sum(weights)
    r = random.uniform(0, total)
    running_total = 0
    for i, w in enumerate(weights):
        running_total += w
        if r <= running_total:
            return items[i]

def make_request(endpoint):
    """Make a request to the specified endpoint"""
    try:
        start_time = time.time()
        response = requests.get(f'{BASE_URL}{endpoint}')
        duration = (time.time() - start_time) * 1000  # Convert to milliseconds
        
        if response.status_code >= 400:
            logging.warning(f'Request to {endpoint} - Status: {response.status_code} - Duration: {duration:.2f}ms')
        else:
            logging.info(f'Request to {endpoint} - Status: {response.status_code} - Duration: {duration:.2f}ms')
        return True
    except Exception as e:
        logging.error(f'Error making request to {endpoint}: {str(e)}')
        return False

def simulate_load(duration_seconds=300, max_workers=10):
    """Simulate load for the specified duration"""
    start_time = time.time()
    success_count = 0
    total_requests = 0

    logging.info(f'Starting load test for {duration_seconds} seconds with {max_workers} workers')

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        while (time.time() - start_time) < duration_seconds:
            # Submit requests for weighted random endpoints
            futures = [
                executor.submit(make_request, weighted_choice(ENDPOINT_WEIGHTS))
                for _ in range(max_workers)
            ]
            
            # Wait for all requests to complete
            for future in futures:
                if future.result():
                    success_count += 1
                total_requests += 1
            
            # Add some randomness to request timing
            time.sleep(random.uniform(0.05, 0.2))

    success_rate = (success_count / total_requests) * 100 if total_requests > 0 else 0
    logging.info(f'Load test completed:')
    logging.info(f'Total requests: {total_requests}')
    logging.info(f'Successful requests: {success_count}')
    logging.info(f'Success rate: {success_rate:.2f}%')

if __name__ == '__main__':
    simulate_load() 