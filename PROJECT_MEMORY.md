# NANOTECH INVOICE MATCHER - PROJECT MEMORY BANK

## 🔧 AWS Configuration
- **Account**: nntech-developer (335716056515)
- **Profile**: nntech-developer
- **Primary Region**: eu-west-1 (Lambda, DynamoDB, Bedrock, SES)
- **Secondary Region**: eu-central-1 (S3 static hosting for admin UI)
- **User ARN**: arn:aws:iam::335716056515:user/nntech-developer

## 🎯 Project Overview
**Goal**: Automated financial reconciliation system that matches bank transactions with outbound/inbound invoices and webshop orders monthly, generating Excel reports via email.

### Core Features
- **Automatic Matching**: Based on invoice number + amount + date
- **AI Support**: Bedrock Claude for "creative" transaction descriptions
- **Admin Interface**: Manual matching and overrides
- **Monthly Reports**: Excel with 5 sheets (matched, uncertain, unmatched invoices, unmatched transactions, summary)
- **Serverless**: AWS Lambda + DynamoDB + S3 + Bedrock

## 🏗️ System Architecture
```
EventBridge (cron) → Lambda (main) → Bedrock (AI) → S3 (Excel) → SES (email)
                           ↓
                    DynamoDB (data/cache)
                           ↑
                    Vue.js Admin (S3 static)
```

## 💰 Cost Estimation
- **Monthly**: ~$0.10
- **Annual**: ~$1.20

### Cost Breakdown
- Lambda: $0.07
- Bedrock (Claude 3 Haiku): $0.01
- DynamoDB: $0.01
- S3: $0.001
- SES: $0.0001
- EventBridge: Free

## 🛠️ Technology Stack

### Backend
- **AWS Lambda**: Node.js 20.x
- **DynamoDB**: NoSQL database
- **Bedrock**: Claude 3 Haiku AI model
- **S3**: Excel file storage
- **SES**: Email delivery
- **EventBridge**: Scheduled execution (2nd of each month at 6:00 AM)

### Frontend (Admin)
- **Vue.js 3**: Composition API
- **Tailwind CSS**: Styling
- **AWS SDK**: DynamoDB connection

### Data Sources
- **Szamlazz.hu API**: Invoices
- **WooCommerce API**: Orders
- **Wise API**: Bank transactions
- **MyPOS API**: Payments
- **OTP CSV**: Bank statements (initially)

## 📁 Project Structure
```
nntech-app/
├── infrastructure/
│   ├── terraform/
│   │   ├── main.tf
│   │   ├── lambda.tf
│   │   ├── dynamodb.tf
│   │   ├── s3.tf
│   │   └── variables.tf
│   └── deploy.sh
├── lambda/
│   ├── main-processor/
│   │   ├── index.js
│   │   ├── package.json
│   │   └── lib/
│   ├── ai-matcher/
│   │   ├── index.js
│   │   └── package.json
│   └── shared/
│       ├── apis/
│       ├── utils/
│       └── config.js
├── admin-frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── views/
│   │   └── main.js
│   ├── package.json
│   └── vite.config.js
├── woocommerce-plugin/
│   ├── nanotech-invoice-export.php
│   └── includes/
└── docs/
    ├── API-DOCS.md
    └── DEPLOYMENT.md
```

## 🔑 Required API Keys (to be stored in AWS Secrets Manager)
- Szamlazz.hu username/password
- Wise API token
- MyPOS API token
- WooCommerce REST API key/secret

## 🎯 Matching Logic
1. **Exact Matching**: Invoice number (E-NNTCH-YYYY-1234 or E-FRDLT-YYYY-1234) + amount + date
2. **AI Matching**: Bedrock Claude for unclear transaction descriptions
3. **Manual Override**: Admin interface for edge cases

## 📊 Excel Report Structure
1. **Sheet 1**: Matched transactions (green)
2. **Sheet 2**: Uncertain matches (yellow) 
3. **Sheet 3**: Unmatched invoices (red)
4. **Sheet 4**: Unmatched bank transactions (red)
5. **Sheet 5**: Monthly summary

## 🚀 Deployment Strategy
- Terraform for infrastructure
- Lambda deployment packages
- S3 static hosting for admin UI
- Automated deployment script

## 📧 Email Configuration
- **Sender**: szamlazas@nanotech.co.hu
- **Recipient**: szamlazas@nanotech.co.hu
- **Service**: AWS SES (eu-west-1)

## ⏰ Execution Schedule
- **Frequency**: Monthly
- **Date**: 2nd of each month
- **Time**: 6:00 AM UTC
- **Service**: EventBridge cron rule

## 🔐 Security Considerations
- API keys in AWS Secrets Manager
- IAM roles with minimal permissions
- VPC endpoints for enhanced security (optional)
- Encryption at rest and in transit

## 🎛️ Admin Interface Features
- Dashboard with system status
- Manual matching interface
- Report download
- Override management
- API status monitoring

## 📈 Monitoring & Logging
- CloudWatch Logs for Lambda functions
- CloudWatch Metrics for performance
- SES bounce/complaint handling
- Cost monitoring and alerts

## 🔄 Data Flow
1. EventBridge triggers main Lambda
2. Fetch data from all APIs (Szamlazz.hu, Wise, MyPOS, WooCommerce)
3. Store raw data in DynamoDB
4. Perform exact matching
5. AI matching for uncertain cases
6. Generate Excel report
7. Upload to S3
8. Send email notification
9. Update admin interface data

## 🎯 Success Metrics
- Matching accuracy percentage
- Processing time
- Cost per execution
- User satisfaction with admin interface
- Reduction in manual reconciliation time

## 🔧 Development Environment
- **IDE**: VS Code with AWS extensions
- **AWS Profile**: nntech-developer
- **Local Testing**: AWS SAM or direct Lambda invocation
- **Version Control**: Git repository

## 📝 Next Steps After Setup
1. Configure API credentials in Secrets Manager
2. Test individual API connections
3. Implement and test matching algorithms
4. Build and deploy admin interface
5. Set up monitoring and alerting
6. User acceptance testing
7. Production deployment
8. Documentation and training

## 🚨 Critical Dependencies
- Szamlazz.hu API availability
- Bank API reliability (Wise, MyPOS)
- WooCommerce site accessibility
- AWS service availability
- Email delivery success

## 💡 Future Enhancements
- OTP Bank API integration (replace CSV)
- Partial payment handling
- Multiple invoices per transaction
- Mobile app development
- Machine learning for improved matching
- Multi-currency support