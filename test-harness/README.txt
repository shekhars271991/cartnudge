============================================================================
                     Test Harness for Event Ingestion
============================================================================

A configurable load generator for testing the data platform event ingestion
API. Generates realistic user events and sends them to the API at 
configurable rates.

============================================================================
SETUP
============================================================================

1. Install dependencies:

   cd test-harness
   pip install -r requirements.txt

2. Configure your API key in config.yaml:

   api:
     api_key: "proj_YOUR_PROJECT_ID_YOUR_SECRET"

============================================================================
USAGE
============================================================================

QUICK TEST
----------
Run a quick 1-minute test with 10 users:

   python load_generator.py --scenario quick_test

CUSTOM LOAD
-----------
Run with custom parameters:

   python load_generator.py --users 100 --duration 5 --rate 50

   Options:
     --users, -u      Number of simulated users
     --duration, -d   Test duration in minutes  
     --rate, -r       Events per second
     --batch-size, -b Events per batch
     --api-key, -k    Override API key

SCENARIOS
---------
Predefined scenarios in config.yaml:

   quick_test:   10 users,    1 min,   10 events/sec
   medium_load:  100 users,   10 min,  100 events/sec
   heavy_load:   1000 users,  30 min,  500 events/sec
   stress_test:  5000 users,  60 min,  1000 events/sec

Run a scenario:

   python load_generator.py --scenario medium_load

============================================================================
GENERATE CURL COMMANDS (for manual testing)
============================================================================

Generate sample cURL commands without running full load test:

   # All event types
   python generate_curls.py

   # Specific event type
   python generate_curls.py --event-type cart
   python generate_curls.py --event-type page
   python generate_curls.py --event-type order

   # Batch of events
   python generate_curls.py --event-type batch --count 5

   # With specific user
   python generate_curls.py --user-id "my_test_user_001"

============================================================================
CONFIGURATION (config.yaml)
============================================================================

API Settings:
  - base_url: API endpoint (default: http://localhost:8010)
  - api_key: Your project API key (format: proj_{project_id}_{secret})
  - timeout_seconds: Request timeout

User Settings:
  - total_count: Number of unique users to simulate
  - user_id_prefix: Prefix for generated user IDs

Event Settings:
  - batch_size: Events per batch request
  - events_per_second: Target rate
  - duration_minutes: Test duration
  - weights: Probability distribution for event types

============================================================================
EVENT TYPES GENERATED
============================================================================

Cart Events (topic: cart_events):
  - cart.add      - Item added to cart
  - cart.remove   - Item removed from cart
  - cart.update   - Cart quantity updated
  - cart.checkout - Checkout initiated

Page Events (topic: page_events):
  - page.view     - Page viewed
  - page.click    - Element clicked
  - page.search   - Search performed

Order Events (topic: order_events):
  - order.created   - Order placed
  - order.updated   - Order status changed
  - order.fulfilled - Order delivered

User Events (topic: user_events):
  - user.signup - New user registration
  - user.login  - User logged in

============================================================================
OUTPUT
============================================================================

Results are saved to results.json with:
  - Total events sent
  - Successful/failed counts
  - Events per second achieved
  - Error details

Live progress is displayed in the terminal showing:
  - Current event count
  - Real-time rate
  - Error count

============================================================================
EXAMPLES
============================================================================

# Quick smoke test
python load_generator.py -s quick_test -k "proj_xxx_yyy"

# 5 minutes of medium load
python load_generator.py -u 200 -d 5 -r 100 -k "proj_xxx_yyy"

# Generate and copy a curl command
python generate_curls.py -t cart -k "proj_xxx_yyy"

# Stress test (be careful!)
python load_generator.py -s stress_test -k "proj_xxx_yyy"

============================================================================

