#!/bin/bash

set -e

echo "🚀 Deploying Nanotech Invoice Matcher..."

# Check if AWS CLI is configured
if ! aws sts get-caller-identity --profile nntech-developer >/dev/null 2>&1; then
    echo "❌ AWS CLI not configured with nntech-developer profile"
    exit 1
fi

# Build Lambda functions
echo "📦 Building Lambda functions..."

# Build API tester
cd ../lambda/api-tester
zip -r ../../infrastructure/terraform/api-tester.zip . -x "*.git*" "docs/*" "*.md" "test-*" "PROJECT_*" > /dev/null 2>&1
cd ../../infrastructure

# Build file processor
cd ../lambda/file-processor
npm install > /dev/null 2>&1
zip -r ../../infrastructure/terraform/file-processor.zip . -x "*.git*" "docs/*" "*.md" "test-*" "PROJECT_*" "node_modules/*" > /dev/null 2>&1
cd ../../infrastructure

# Build main processor
cd ../lambda/main-processor
npm install > /dev/null 2>&1
zip -r ../../infrastructure/terraform/main-processor.zip . -x "*.git*" "docs/*" "*.md" "test-*" "PROJECT_*" "node_modules/*" > /dev/null 2>&1
cd ../../infrastructure

# Build AI matcher
cd ../lambda/ai-matcher
npm install > /dev/null 2>&1
zip -r ../../infrastructure/terraform/ai-matcher.zip . -x "*.git*" "docs/*" "*.md" "test-*" "PROJECT_*" "node_modules/*" > /dev/null 2>&1
cd ../../infrastructure

# Deploy infrastructure
echo "🏗️ Deploying infrastructure..."
cd terraform
terraform init
terraform plan
terraform apply -auto-approve

# Get outputs
ADMIN_BUCKET=$(terraform output -raw admin_bucket_name)
ADMIN_DOMAIN=$(terraform output -raw admin_domain)
REPORTS_BUCKET=$(terraform output -raw reports_bucket)

echo "✅ Deployment completed!"
echo "📊 Admin interface: http://$ADMIN_DOMAIN"
echo "📁 Reports bucket: $REPORTS_BUCKET"
echo "💰 Estimated monthly cost: ~$0.10"

# Cleanup
rm -f api-tester.zip file-processor.zip main-processor.zip ai-matcher.zip

cd ..