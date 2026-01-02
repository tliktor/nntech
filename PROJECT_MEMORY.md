# NNTECH INVOICE MATCHER - MEMORY BANK

## 🔧 AWS Setup
- **Account**: nntech-developer (335716056515)
- **Profile**: nntech-developer  
- **Regions**: eu-west-1 (main), eu-central-1 (admin UI)
- **Status**: ✅ DEPLOYED
- **Dev Policy**: No local dev server - push everything to AWS

## 🎯 System Overview
Serverless invoice matching: bank transactions ↔ invoices/orders → Excel reports via email
- **Cost**: ~$0.10/month
- **Schedule**: 2nd of each month, 6:00 AM UTC
- **Architecture**: EventBridge → Lambda → DynamoDB → S3 → SES

## 🔑 API Credentials (in Secrets Manager)
- MyPOS: `aJwmyL6ENyckSgz6vCvu5nd0` / `V30tpym4qHQR605ft1RMLJZY0ywrDecaPvBYcND5MhTb1LL4`
- Wise: `8718e5d5-6075-4afa-a50d-2960d0223f47`
- Szamlazz.hu: `01050yqnq427vbvprn7a9jy7vbvprtad8e47vbvprk`
- WooCommerce: `ck_1d6d7bdca307fd5d00a09bdf8b27382faf7af209` / `cs_37a31b114ce9c9be94cdc2d7593edf923b9b70d3`

## 📁 Key Resources
- **Lambda**: `nntech-invoice-matcher-main-processor`, `nntech-invoice-matcher-ai-matcher`
- **DynamoDB**: `nntech-invoice-matcher-data`
- **S3**: `nntech-invoice-matcher-reports-00b6f5fd`, `nntech-invoice-matcher-admin-00b6f5fd`
- **Admin UI**: http://nntech-invoice-matcher-admin-00b6f5fd.s3-website.eu-central-1.amazonaws.com
- **GitHub**: https://github.com/tliktor/nntech

## 🚀 Quick Commands
```bash
# Deploy
bash infrastructure/deploy.sh

# Test
aws lambda invoke --function-name nntech-invoice-matcher-main-processor --payload '{}' --profile nntech-developer --region eu-west-1 response.json

# Logs
aws logs tail /aws/lambda/nntech-invoice-matcher-main-processor --follow --profile nntech-developer --region eu-west-1

# Data
aws dynamodb scan --table-name nntech-invoice-matcher-data --profile nntech-developer --region eu-west-1
```

## 📋 Next Steps
- [ ] Update WooCommerce URL in Lambda
- [ ] Verify SES email: szamlazas@nanotech.co.hu
- [ ] Request Bedrock Claude access
- [ ] Test real API endpoints

## 📚 References
- **Full Docs**: `/docs/NANOTECH-INVOICE-MATCHER.md`
- **Completion Report**: `PROJECT_COMPLETE.md`
- **Infrastructure**: `infrastructure/terraform/`
- **Lambda Code**: `lambda/main-processor/`, `lambda/ai-matcher/`