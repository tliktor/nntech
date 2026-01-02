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

cd lambda/main-processor
npm install --production
zip -r ../../main-processor.zip . -x "*.git*" "node_modules/.cache/*"
cd ../..

cd lambda/ai-matcher
npm install --production
zip -r ../../ai-matcher.zip . -x "*.git*" "node_modules/.cache/*"
cd ../..

# Move zip files to terraform directory
mv main-processor.zip infrastructure/terraform/
mv ai-matcher.zip infrastructure/terraform/

# Deploy infrastructure
echo "🏗️ Deploying infrastructure..."
cd infrastructure/terraform
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
rm -f main-processor.zip ai-matcher.zip

cd ../..