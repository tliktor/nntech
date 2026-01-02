# Nanotech Invoice Matcher

Automated serverless invoice matching system built on AWS.

## 🚀 Requirements

### Runtime Requirements
- **Node.js 22+** - Required for all Lambda functions
- **AWS SDK v3** - Modern AWS SDK with improved performance and tree-shaking

### AWS Services
- AWS Lambda (Node.js 22.x runtime)
- DynamoDB
- S3
- SES
- Bedrock (Claude 3 Haiku)
- EventBridge
- Secrets Manager

## 📦 Dependencies

### Lambda Functions
All Lambda functions now use:
- **AWS SDK v3** modular packages instead of the monolithic v2 SDK
- **ES Modules** (import/export) instead of CommonJS (require/module.exports)
- **Node.js 22.x** runtime for improved performance and latest features

### Key Changes from Previous Version
- ✅ Upgraded from Node.js 20.x to **Node.js 22.x**
- ✅ Migrated from AWS SDK v2 to **AWS SDK v3**
- ✅ Updated all package.json files with proper engine requirements
- ✅ Updated Terraform configurations for nodejs22.x runtime
- ✅ Updated documentation examples

## 🏗️ Architecture

```
EventBridge (cron) → Lambda (Node.js 22) → Bedrock (AI) → S3 (Excel) → SES (email)
                           ↓
                    DynamoDB (data/cache)
                           ↑
                    Vue.js Admin (S3 static)
```

## 💰 Cost Estimate
- **Monthly**: ~$0.10
- **Annual**: ~$1.20

## 📚 Documentation

- [Complete Project Documentation](./PROJECT_COMPLETE.md)
- [Detailed Technical Documentation](./docs/NANOTECH-INVOICE-MATCHER.md)

## 🚀 Quick Start

1. **Prerequisites**
   ```bash
   node --version  # Should be 22.x or higher
   aws --version   # AWS CLI v2
   terraform --version
   ```

2. **Deploy Infrastructure**
   ```bash
   cd infrastructure
   ./deploy.sh
   ```

3. **Access Admin Interface**
   - URL provided after deployment
   - Monitor system status and manual execution

## 🔧 Development

### Local Development
```bash
# Install dependencies (Node.js 22+ required)
cd lambda/main-processor
npm install

cd ../ai-matcher  
npm install
```

### Testing
```bash
# Test Lambda function locally
npm test

# Deploy and test
aws lambda invoke --function-name nntech-invoice-matcher-main-processor response.json
```

## 📋 Migration Notes

If upgrading from a previous version:

1. **Update Node.js**: Ensure Node.js 22+ is installed
2. **Update Dependencies**: Run `npm install` in all Lambda directories
3. **Redeploy**: Use the deployment script to update Lambda runtimes
4. **Test**: Verify all functions work with the new runtime

## 🎯 Features

- ✅ Automated monthly invoice matching
- ✅ AI-powered transaction analysis (Bedrock Claude)
- ✅ Excel report generation
- ✅ Email notifications
- ✅ Admin web interface
- ✅ Multi-source data integration (Szamlazz.hu, Wise, MyPOS, WooCommerce)

## 📞 Support

For technical issues or questions, check the detailed documentation in the `docs/` directory.