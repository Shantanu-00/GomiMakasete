# ==============================================================================
# GomiMakasete Makefile — AWS Hackathon One-Command Entrypoint
# ==============================================================================

.PHONY: help install dev test lint clean build-frontend sam-validate sam-build sam-deploy seed-dynamodb

help:
	@echo "GomiMakasete Developer Commands:"
	@echo "  make install         Install backend and frontend dependencies"
	@echo "  make dev             Run mock agent loop and backend locally"
	@echo "  make test            Run unit and integration test suite"
	@echo "  make lint            Run ruff/flake8 code style checks"
	@echo "  make build-frontend  Compile Next.js 15 production bundle"
	@echo "  make sam-validate    Lint and validate AWS SAM infrastructure template"
	@echo "  make sam-build       Build AWS SAM serverless container template"
	@echo "  make sam-deploy      Deploy stack to Amazon Bedrock AgentCore with rollback protection"
	@echo "  make seed-dynamodb   Batch-seed 178 neighborhoods into DynamoDB schedule table"

install:
	@echo "==> Installing Python requirements..."
	pip install -r src/backend/requirements.txt
	@echo "==> Installing Next.js frontend dependencies..."
	cd frontend && npm install

dev:
	@echo "==> Starting Bedrock AgentCore local runtime server on port 8080..."
	python src/backend/app.py

test:
	@echo "==> Running pytest suite for Strands tools and AgentCore contracts..."
	pytest tests/

lint:
	@echo "==> Checking code quality with ruff..."
	ruff check src/ tests/

build-frontend:
	@echo "==> Building Next.js 15 application..."
	cd frontend && npm run build

sam-validate:
	@echo "==> Validating and linting AWS SAM template..."
	sam validate -t infra/sam/template.yaml --lint

sam-build:
	@echo "==> Building AWS SAM Infrastructure template..."
	sam build -t infra/sam/template.yaml

sam-deploy:
	@echo "==> Deploying AWS SAM template to Bedrock AgentCore with rollback safety..."
	sam deploy --config-file infra/sam/samconfig.toml

seed-dynamodb:
	@echo "==> Seeding 178 municipal neighborhoods into Amazon DynamoDB..."
	python data/scripts/seed_dynamodb_schedules.py

clean:
	@echo "==> Cleaning cache directories..."
	rm -rf .pytest_cache .ruff_cache __pycache__
	find . -type d -name "__pycache__" -exec rm -rf {} +
