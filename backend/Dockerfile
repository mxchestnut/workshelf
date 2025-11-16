FROM python:3.11-slim

WORKDIR /app

# Install curl for health checks
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY app/ ./app/
COPY alembic/ ./alembic/
COPY alembic.ini ./
COPY scripts/ ./scripts/
COPY start.sh ./

# Make start script executable
RUN chmod +x start.sh

# Expose port
EXPOSE 8000

# Run the application with migrations
CMD ["/bin/bash", "./start.sh"]
