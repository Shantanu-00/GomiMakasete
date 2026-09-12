# syntax=docker/dockerfile:1
# Amazon Bedrock AgentCore Runtime Container Specification
# Mandatory Target Architecture: linux/arm64
# Mandatory Listening Port: 8080

FROM public.ecr.aws/docker/library/python:3.11-slim

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8080 \
    HOST=0.0.0.0

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install Python requirements
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application source code and normalized data
COPY . /app

# AgentCore HTTP contract requires health check on /ping
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/ping || exit 1

EXPOSE 8080

# Execute server
CMD ["python", "main.py"]
