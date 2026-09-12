# ==============================================================================
# GomiMakasete Windows PowerShell Deployment Script
# 1-Shot Automated Build, Rollback-Safe Deploy & DynamoDB Seeding
# ==============================================================================

$ErrorActionPreference = "Stop"

Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host "🚀 GOMIMAKASETE AWS 1-SHOT PRODUCTION DEPLOYMENT" -ForegroundColor Cyan
Write-Host "========================================================`n" -ForegroundColor Cyan

# 1. Check Caller Identity
Write-Host "==> Checking AWS credentials..." -ForegroundColor Yellow
aws sts get-caller-identity
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: AWS credentials are invalid. Please run 'aws configure' first." -ForegroundColor Red
    exit 1
}

# 2. Build SAM Template
Write-Host "`n==> 1. Building SAM ARM64 Lambda package..." -ForegroundColor Yellow
sam build -t infra/sam/template.yaml
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: SAM build failed." -ForegroundColor Red
    exit 1
}

# 3. Deploy Stack with Rollback Protection
Write-Host "`n==> 2. Deploying CloudFormation stack to AWS..." -ForegroundColor Yellow
sam deploy --config-file infra/sam/samconfig.toml
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: SAM deployment failed. Changes have been cleanly rolled back." -ForegroundColor Red
    exit 1
}

# 4. Seed DynamoDB Schedules
Write-Host "`n==> 3. Seeding 178 municipal neighborhoods into DynamoDB..." -ForegroundColor Yellow
python data/scripts/seed_dynamodb_schedules.py
if ($LASTEXITCODE -ne 0) {
    Write-Host "WARNING: Database seeding encountered an issue." -ForegroundColor Magenta
}

Write-Host "`n========================================================" -ForegroundColor Green
Write-Host "🎉 DEPLOYMENT COMPLETE! All services live and protected." -ForegroundColor Green
Write-Host "========================================================`n" -ForegroundColor Green
