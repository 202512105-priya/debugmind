#!/bin/bash

# Let script fail if any command fails
set -e

# Wait for PostgreSQL to become available
python -c "
import time
import psycopg2
from app.core.config import settings

print('Waiting for postgres...')
for i in range(30):
    try:
        # Connect to DB to check liveness (remove driver prefix if needed)
        db_url = settings.DATABASE_URL
        if db_url.startswith('postgresql+psycopg2://'):
            db_url = db_url.replace('+psycopg2', '')
        conn = psycopg2.connect(db_url)
        conn.close()
        print('Postgres is ready!')
        break
    except Exception as e:
        print(f'Attempt {i+1}/30 failed: {e}')
        time.sleep(1)
else:
    print('Postgres was not ready in time.')
    exit(1)
"

# Run alembic migrations
echo "Running alembic migrations..."
alembic upgrade head

# Start API application
echo "Starting FastAPI app..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
