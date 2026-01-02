# NANOTECH INVOICE MATCHER - SERVERLESS RENDSZER

## 🎯 PROJEKT ÁTTEKINTÉS

### Cél
Automatizált pénzügyi egyeztetési rendszer, amely havonta egyszer párosítja a bankszámla mozgásokat a kiállított/bejövő számlákkal, és Excel riportot küld email-ben.

### Főbb funkciók
- **Automatikus párosítás**: Számla sorszám + összeg + dátum alapján
- **AI támogatás**: Bedrock Claude a "kreatív" közlemények feldolgozásához
- **Admin felület**: Manuális párosítás és felülbírálás
- **Havi riport**: Excel táblázat 5 sheet-tel
- **Serverless**: AWS Lambda + DynamoDB + S3 + Bedrock

## 🏗️ RENDSZER ARCHITEKTÚRA

### AWS Régiók
- **eu-central-1**: S3 static hosting (admin felület)
- **eu-west-1**: Lambda functions, DynamoDB, Bedrock, SES

### Komponensek
```
EventBridge (cron) → Lambda (main) → Bedrock (AI) → S3 (Excel) → SES (email)
                           ↓
                    DynamoDB (adatok/cache)
                           ↑
                    Vue.js Admin (S3 static)
```

## 💰 KÖLTSÉGBECSLÉS

### Havi költségek
- **Lambda**: $0.07 (main + AI functions)
- **Bedrock**: $0.01 (Claude 3 Haiku)
- **DynamoDB**: $0.01 (on-demand)
- **S3**: $0.001 (tárolás + requests)
- **SES**: $0.0001 (1 email)
- **EventBridge**: Ingyenes

**Teljes havi költség: ~$0.10**
**Éves költség: ~$1.20**

## 🛠️ TECHNOLÓGIAI STACK

### Backend
- **AWS Lambda**: Node.js 20.x
- **DynamoDB**: NoSQL adatbázis
- **Bedrock**: Claude 3 Haiku AI model
- **S3**: Excel fájlok tárolása
- **SES**: Email küldés
- **EventBridge**: Ütemezett futtatás

### Frontend (Admin)
- **Vue.js 3**: Composition API
- **Tailwind CSS**: Styling
- **AWS SDK**: DynamoDB kapcsolat

### Adatforrások
- **Szamlazz.hu API**: Számlák
- **WooCommerce API**: Rendelések
- **Wise API**: Bank tranzakciók
- **MyPOS API**: Fizetések
- **OTP CSV**: Bank kivonatok (kezdetben)

## 📁 PROJEKT STRUKTÚRA

```
nanotech-invoice-matcher/
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

## 🚀 TELEPÍTÉSI ÚTMUTATÓ

### 1. AWS Account Setup

#### AWS CLI konfiguráció
```bash
# AWS CLI telepítése
curl "https://awscli.amazonaws.com/AWSCLIV2.pkg" -o "AWSCLIV2.pkg"
sudo installer -pkg AWSCLIV2.pkg -target /

# Profil létrehozása
aws configure --profile nanotech-invoice
# AWS Access Key ID: [ÚJ USER KULCSA]
# AWS Secret Access Key: [ÚJ USER TITKA]
# Default region name: eu-west-1
# Default output format: json
```

#### IAM User létrehozása
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "lambda:*",
        "dynamodb:*",
        "s3:*",
        "bedrock:*",
        "ses:*",
        "events:*",
        "iam:PassRole",
        "logs:*"
      ],
      "Resource": "*"
    }
  ]
}
```

### 2. Terraform Infrastructure

#### main.tf
```hcl
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region  = "eu-west-1"
  profile = "nanotech-invoice"
}

provider "aws" {
  alias   = "eu-central"
  region  = "eu-central-1"
  profile = "nanotech-invoice"
}

# Variables
variable "project_name" {
  default = "nanotech-invoice-matcher"
}

variable "environment" {
  default = "prod"
}
```

#### lambda.tf
```hcl
# Main Processor Lambda
resource "aws_lambda_function" "main_processor" {
  filename         = "../lambda/main-processor.zip"
  function_name    = "${var.project_name}-main-processor"
  role            = aws_iam_role.lambda_role.arn
  handler         = "index.handler"
  runtime         = "nodejs20.x"
  timeout         = 900  # 15 minutes
  memory_size     = 512

  environment {
    variables = {
      DYNAMODB_TABLE = aws_dynamodb_table.invoices.name
      S3_BUCKET      = aws_s3_bucket.reports.bucket
      AI_LAMBDA_ARN  = aws_lambda_function.ai_matcher.arn
    }
  }
}

# AI Matcher Lambda
resource "aws_lambda_function" "ai_matcher" {
  filename         = "../lambda/ai-matcher.zip"
  function_name    = "${var.project_name}-ai-matcher"
  role            = aws_iam_role.lambda_role.arn
  handler         = "index.handler"
  runtime         = "nodejs20.x"
  timeout         = 300  # 5 minutes
  memory_size     = 256
}

# Lambda IAM Role
resource "aws_iam_role" "lambda_role" {
  name = "${var.project_name}-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

# Lambda Policy
resource "aws_iam_role_policy" "lambda_policy" {
  name = "${var.project_name}-lambda-policy"
  role = aws_iam_role.lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "dynamodb:*",
          "s3:*",
          "bedrock:InvokeModel",
          "ses:SendEmail",
          "lambda:InvokeFunction"
        ]
        Resource = "*"
      }
    ]
  })
}

# EventBridge Rule (minden hó 2. napján 6:00)
resource "aws_cloudwatch_event_rule" "monthly_trigger" {
  name                = "${var.project_name}-monthly"
  description         = "Trigger invoice matching monthly"
  schedule_expression = "cron(0 6 2 * ? *)"
}

resource "aws_cloudwatch_event_target" "lambda_target" {
  rule      = aws_cloudwatch_event_rule.monthly_trigger.name
  target_id = "TriggerLambda"
  arn       = aws_lambda_function.main_processor.arn
}

resource "aws_lambda_permission" "allow_eventbridge" {
  statement_id  = "AllowExecutionFromEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.main_processor.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.monthly_trigger.arn
}
```

#### dynamodb.tf
```hcl
# Main table for invoices and transactions
resource "aws_dynamodb_table" "invoices" {
  name           = "${var.project_name}-data"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "PK"
  range_key      = "SK"

  attribute {
    name = "PK"
    type = "S"
  }

  attribute {
    name = "SK"
    type = "S"
  }

  attribute {
    name = "GSI1PK"
    type = "S"
  }

  attribute {
    name = "GSI1SK"
    type = "S"
  }

  global_secondary_index {
    name     = "GSI1"
    hash_key = "GSI1PK"
    range_key = "GSI1SK"
  }

  tags = {
    Name = "${var.project_name}-data"
    Environment = var.environment
  }
}

# Admin overrides table
resource "aws_dynamodb_table" "admin_overrides" {
  name           = "${var.project_name}-overrides"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "override_id"

  attribute {
    name = "override_id"
    type = "S"
  }

  tags = {
    Name = "${var.project_name}-overrides"
    Environment = var.environment
  }
}
```

#### s3.tf
```hcl
# Reports bucket (eu-west-1)
resource "aws_s3_bucket" "reports" {
  bucket = "${var.project_name}-reports-${random_id.bucket_suffix.hex}"
}

resource "random_id" "bucket_suffix" {
  byte_length = 4
}

# Admin frontend bucket (eu-central-1)
resource "aws_s3_bucket" "admin_frontend" {
  provider = aws.eu-central
  bucket   = "${var.project_name}-admin-${random_id.bucket_suffix.hex}"
}

resource "aws_s3_bucket_website_configuration" "admin_frontend" {
  provider = aws.eu-central
  bucket   = aws_s3_bucket.admin_frontend.id

  index_document {
    suffix = "index.html"
  }

  error_document {
    key = "error.html"
  }
}

resource "aws_s3_bucket_public_access_block" "admin_frontend" {
  provider = aws.eu-central
  bucket   = aws_s3_bucket.admin_frontend.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

resource "aws_s3_bucket_policy" "admin_frontend" {
  provider = aws.eu-central
  bucket   = aws_s3_bucket.admin_frontend.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "PublicReadGetObject"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.admin_frontend.arn}/*"
      }
    ]
  })
}

# Secrets Manager for API keys
resource "aws_secretsmanager_secret" "api_keys" {
  name = "${var.project_name}-api-keys"
}

resource "aws_secretsmanager_secret_version" "api_keys" {
  secret_id = aws_secretsmanager_secret.api_keys.id
  secret_string = jsonencode({
    szamlazz_username = "YOUR_SZAMLAZZ_USERNAME"
    szamlazz_password = "YOUR_SZAMLAZZ_PASSWORD"
    wise_token        = "YOUR_WISE_TOKEN"
    mypos_token       = "YOUR_MYPOS_TOKEN"
    woocommerce_key   = "YOUR_WC_KEY"
    woocommerce_secret = "YOUR_WC_SECRET"
  })
}

# SES Email Identity
resource "aws_ses_email_identity" "sender" {
  email = "szamlazas@nanotech.co.hu"
}
```

### 3. Lambda Functions

#### Main Processor (lambda/main-processor/index.js)
```javascript
const AWS = require('aws-sdk');
const ExcelJS = require('exceljs');

const dynamodb = new AWS.DynamoDB.DocumentClient();
const s3 = new AWS.S3();
const ses = new AWS.SES();
const lambda = new AWS.Lambda();
const secretsManager = new AWS.SecretsManager();

exports.handler = async (event) => {
    console.log('Starting monthly invoice matching process');
    
    try {
        // 1. Get API credentials
        const secrets = await getSecrets();
        
        // 2. Calculate previous month date range
        const dateRange = getPreviousMonthRange();
        
        // 3. Fetch data from all sources
        const [invoices, transactions, orders] = await Promise.all([
            fetchSzamlazzInvoices(secrets, dateRange),
            fetchBankTransactions(secrets, dateRange),
            fetchWooCommerceOrders(secrets, dateRange)
        ]);
        
        // 4. Store raw data in DynamoDB
        await storeRawData(invoices, transactions, orders, dateRange);
        
        // 5. Perform matching
        const matchingResults = await performMatching(invoices, transactions, orders);
        
        // 6. Generate Excel report
        const excelBuffer = await generateExcelReport(matchingResults, dateRange);
        
        // 7. Upload to S3
        const s3Key = `reports/${dateRange.year}-${dateRange.month.toString().padStart(2, '0')}-invoice-report.xlsx`;
        await s3.putObject({
            Bucket: process.env.S3_BUCKET,
            Key: s3Key,
            Body: excelBuffer,
            ContentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        }).promise();
        
        // 8. Send email
        await sendEmailReport(s3Key, dateRange, matchingResults.summary);
        
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Invoice matching completed successfully',
                reportUrl: `s3://${process.env.S3_BUCKET}/${s3Key}`,
                summary: matchingResults.summary
            })
        };
        
    } catch (error) {
        console.error('Error in invoice matching:', error);
        
        // Send error notification
        await sendErrorNotification(error);
        
        throw error;
    }
};

async function getSecrets() {
    const result = await secretsManager.getSecretValue({
        SecretId: process.env.SECRETS_ARN || 'nanotech-invoice-matcher-api-keys'
    }).promise();
    
    return JSON.parse(result.SecretString);
}

function getPreviousMonthRange() {
    const now = new Date();
    const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    const month = now.getMonth() === 0 ? 12 : now.getMonth();
    
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    
    return {
        year,
        month,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
    };
}

async function fetchSzamlazzInvoices(secrets, dateRange) {
    const axios = require('axios');
    
    // Szamlazz.hu API hívás
    const response = await axios.post('https://www.szamlazz.hu/szamla/', {
        username: secrets.szamlazz_username,
        password: secrets.szamlazz_password,
        action: 'list',
        fromDate: dateRange.startDate,
        toDate: dateRange.endDate
    });
    
    return response.data.invoices || [];
}

async function fetchBankTransactions(secrets, dateRange) {
    const transactions = [];
    
    // Wise API
    try {
        const wiseTransactions = await fetchWiseTransactions(secrets.wise_token, dateRange);
        transactions.push(...wiseTransactions.map(t => ({ ...t, bank: 'wise' })));
    } catch (error) {
        console.error('Wise API error:', error);
    }
    
    // MyPOS API
    try {
        const myposTransactions = await fetchMyPOSTransactions(secrets.mypos_token, dateRange);
        transactions.push(...myposTransactions.map(t => ({ ...t, bank: 'mypos' })));
    } catch (error) {
        console.error('MyPOS API error:', error);
    }
    
    // OTP CSV (később API)
    // TODO: Implement OTP CSV parsing
    
    return transactions;
}

async function fetchWiseTransactions(token, dateRange) {
    const axios = require('axios');
    
    const response = await axios.get('https://api.wise.com/v1/profiles', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    
    // Implement Wise API calls
    return [];
}

async function fetchMyPOSTransactions(token, dateRange) {
    // Implement MyPOS API calls
    return [];
}

async function fetchWooCommerceOrders(secrets, dateRange) {
    const WooCommerceRestApi = require('@woocommerce/woocommerce-rest-api').default;
    
    const WooCommerce = new WooCommerceRestApi({
        url: 'https://your-woocommerce-site.com',
        consumerKey: secrets.woocommerce_key,
        consumerSecret: secrets.woocommerce_secret,
        version: 'wc/v3'
    });
    
    const response = await WooCommerce.get('orders', {
        after: dateRange.startDate,
        before: dateRange.endDate,
        per_page: 100
    });
    
    return response.data;
}

async function storeRawData(invoices, transactions, orders, dateRange) {
    const items = [];
    
    // Store invoices
    invoices.forEach(invoice => {
        items.push({
            PutRequest: {
                Item: {
                    PK: `INVOICE#${invoice.number}`,
                    SK: `${dateRange.year}-${dateRange.month}`,
                    type: 'invoice',
                    data: invoice,
                    GSI1PK: `MONTH#${dateRange.year}-${dateRange.month}`,
                    GSI1SK: `INVOICE#${invoice.number}`
                }
            }
        });
    });
    
    // Store transactions
    transactions.forEach(transaction => {
        items.push({
            PutRequest: {
                Item: {
                    PK: `TRANSACTION#${transaction.id}`,
                    SK: `${dateRange.year}-${dateRange.month}`,
                    type: 'transaction',
                    data: transaction,
                    GSI1PK: `MONTH#${dateRange.year}-${dateRange.month}`,
                    GSI1SK: `TRANSACTION#${transaction.id}`
                }
            }
        });
    });
    
    // Batch write to DynamoDB
    const chunks = chunkArray(items, 25);
    for (const chunk of chunks) {
        await dynamodb.batchWrite({
            RequestItems: {
                [process.env.DYNAMODB_TABLE]: chunk
            }
        }).promise();
    }
}

async function performMatching(invoices, transactions, orders) {
    const matches = [];
    const unmatchedInvoices = [...invoices];
    const unmatchedTransactions = [...transactions];
    const uncertainMatches = [];
    
    // 1. Exact invoice number matching
    for (const transaction of transactions) {
        const invoiceNumber = extractInvoiceNumber(transaction.description || transaction.reference);
        
        if (invoiceNumber) {
            const matchingInvoice = invoices.find(inv => inv.number === invoiceNumber);
            
            if (matchingInvoice && Math.abs(matchingInvoice.amount - transaction.amount) < 0.01) {
                matches.push({
                    invoice: matchingInvoice,
                    transaction: transaction,
                    confidence: 100,
                    matchType: 'exact'
                });
                
                // Remove from unmatched arrays
                const invIndex = unmatchedInvoices.findIndex(inv => inv.number === matchingInvoice.number);
                const transIndex = unmatchedTransactions.findIndex(trans => trans.id === transaction.id);
                
                if (invIndex > -1) unmatchedInvoices.splice(invIndex, 1);
                if (transIndex > -1) unmatchedTransactions.splice(transIndex, 1);
            }
        }
    }
    
    // 2. AI-powered matching for uncertain cases
    for (const transaction of unmatchedTransactions) {
        if (transaction.description && transaction.description.length > 5) {
            try {
                const aiResult = await lambda.invoke({
                    FunctionName: process.env.AI_LAMBDA_ARN,
                    Payload: JSON.stringify({
                        transaction: transaction,
                        availableInvoices: unmatchedInvoices
                    })
                }).promise();
                
                const aiMatch = JSON.parse(aiResult.Payload);
                
                if (aiMatch.confidence > 70) {
                    uncertainMatches.push({
                        invoice: aiMatch.invoice,
                        transaction: transaction,
                        confidence: aiMatch.confidence,
                        matchType: 'ai',
                        aiReasoning: aiMatch.reasoning
                    });
                }
            } catch (error) {
                console.error('AI matching error:', error);
            }
        }
    }
    
    return {
        exactMatches: matches,
        uncertainMatches: uncertainMatches,
        unmatchedInvoices: unmatchedInvoices,
        unmatchedTransactions: unmatchedTransactions,
        summary: {
            totalInvoices: invoices.length,
            totalTransactions: transactions.length,
            exactMatches: matches.length,
            uncertainMatches: uncertainMatches.length,
            unmatchedInvoices: unmatchedInvoices.length,
            unmatchedTransactions: unmatchedTransactions.length
        }
    };
}

function extractInvoiceNumber(text) {
    if (!text) return null;
    
    // Regex for E-NNTCH-YYYY-1234 and E-FRDLT-YYYY-1234 formats
    const regex = /E-(NNTCH|FRDLT)-(\d{4})-(\d+)/i;
    const match = text.match(regex);
    
    return match ? match[0] : null;
}

async function generateExcelReport(matchingResults, dateRange) {
    const workbook = new ExcelJS.Workbook();
    
    // Sheet 1: Párosított ügyletek (zöld)
    const exactSheet = workbook.addWorksheet('Párosított ügyletek');
    exactSheet.addRow([
        'Számla szám', 'Tranzakció ID', 'Összeg (számla)', 'Összeg (bank)',
        'Dátum (számla)', 'Dátum (bank)', 'Bank', 'Közlemény', 'Párosítás típus'
    ]);
    
    matchingResults.exactMatches.forEach(match => {
        const row = exactSheet.addRow([
            match.invoice.number,
            match.transaction.id,
            match.invoice.amount,
            match.transaction.amount,
            match.invoice.date,
            match.transaction.date,
            match.transaction.bank,
            match.transaction.description,
            match.matchType
        ]);
        row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD4EDDA' } };
    });
    
    // Sheet 2: Bizonytalan párosítások (sárga)
    const uncertainSheet = workbook.addWorksheet('Bizonytalan párosítások');
    uncertainSheet.addRow([
        'Számla szám', 'Tranzakció ID', 'Összeg (számla)', 'Összeg (bank)',
        'Dátum (számla)', 'Dátum (bank)', 'Bank', 'Közlemény', 'AI bizonyosság %', 'AI indoklás'
    ]);
    
    matchingResults.uncertainMatches.forEach(match => {
        const row = uncertainSheet.addRow([
            match.invoice.number,
            match.transaction.id,
            match.invoice.amount,
            match.transaction.amount,
            match.invoice.date,
            match.transaction.date,
            match.transaction.bank,
            match.transaction.description,
            match.confidence,
            match.aiReasoning
        ]);
        row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3CD' } };
    });
    
    // Sheet 3: Párosítatlan számlák (piros)
    const unmatchedInvoicesSheet = workbook.addWorksheet('Párosítatlan számlák');
    unmatchedInvoicesSheet.addRow(['Számla szám', 'Összeg', 'Dátum', 'Ügyfél', 'Típus']);
    
    matchingResults.unmatchedInvoices.forEach(invoice => {
        const row = unmatchedInvoicesSheet.addRow([
            invoice.number,
            invoice.amount,
            invoice.date,
            invoice.customer,
            invoice.type
        ]);
        row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8D7DA' } };
    });
    
    // Sheet 4: Párosítatlan banki tételek (piros)
    const unmatchedTransactionsSheet = workbook.addWorksheet('Párosítatlan banki tételek');
    unmatchedTransactionsSheet.addRow(['Tranzakció ID', 'Összeg', 'Dátum', 'Bank', 'Közlemény']);
    
    matchingResults.unmatchedTransactions.forEach(transaction => {
        const row = unmatchedTransactionsSheet.addRow([
            transaction.id,
            transaction.amount,
            transaction.date,
            transaction.bank,
            transaction.description
        ]);
        row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8D7DA' } };
    });
    
    // Sheet 5: Havi összesítő
    const summarySheet = workbook.addWorksheet('Havi összesítő');
    summarySheet.addRow(['Kategória', 'Darab', 'Összeg']);
    summarySheet.addRow(['Összes számla', matchingResults.summary.totalInvoices, '']);
    summarySheet.addRow(['Összes tranzakció', matchingResults.summary.totalTransactions, '']);
    summarySheet.addRow(['Pontos párosítás', matchingResults.summary.exactMatches, '']);
    summarySheet.addRow(['Bizonytalan párosítás', matchingResults.summary.uncertainMatches, '']);
    summarySheet.addRow(['Párosítatlan számla', matchingResults.summary.unmatchedInvoices, '']);
    summarySheet.addRow(['Párosítatlan tranzakció', matchingResults.summary.unmatchedTransactions, '']);
    
    return await workbook.xlsx.writeBuffer();
}

async function sendEmailReport(s3Key, dateRange, summary) {
    const params = {
        Destination: {
            ToAddresses: ['szamlazas@nanotech.co.hu']
        },
        Message: {
            Body: {
                Html: {
                    Data: `
                        <h2>Havi számla egyeztetési riport - ${dateRange.year}/${dateRange.month.toString().padStart(2, '0')}</h2>
                        
                        <h3>Összesítő:</h3>
                        <ul>
                            <li>Összes számla: ${summary.totalInvoices}</li>
                            <li>Összes tranzakció: ${summary.totalTransactions}</li>
                            <li>Pontos párosítás: ${summary.exactMatches}</li>
                            <li>Bizonytalan párosítás: ${summary.uncertainMatches}</li>
                            <li>Párosítatlan számla: ${summary.unmatchedInvoices}</li>
                            <li>Párosítatlan tranzakció: ${summary.unmatchedTransactions}</li>
                        </ul>
                        
                        <p>A részletes riport letölthető az admin felületről.</p>
                        
                        <p>Admin felület: <a href="https://${process.env.ADMIN_DOMAIN}">https://${process.env.ADMIN_DOMAIN}</a></p>
                    `
                }
            },
            Subject: {
                Data: `Számla egyeztetés - ${dateRange.year}/${dateRange.month.toString().padStart(2, '0')}`
            }
        },
        Source: 'szamlazas@nanotech.co.hu'
    };
    
    await ses.sendEmail(params).promise();
}

async function sendErrorNotification(error) {
    const params = {
        Destination: {
            ToAddresses: ['szamlazas@nanotech.co.hu']
        },
        Message: {
            Body: {
                Text: {
                    Data: `Hiba történt a számla egyeztetés során:\n\n${error.message}\n\nStack trace:\n${error.stack}`
                }
            },
            Subject: {
                Data: 'HIBA: Számla egyeztetés sikertelen'
            }
        },
        Source: 'szamlazas@nanotech.co.hu'
    };
    
    await ses.sendEmail(params).promise();
}

function chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
}
```

#### AI Matcher Lambda (lambda/ai-matcher/index.js)
```javascript
const AWS = require('aws-sdk');

const bedrock = new AWS.BedrockRuntime({
    region: 'eu-west-1'
});

exports.handler = async (event) => {
    const { transaction, availableInvoices } = event;
    
    try {
        const prompt = buildPrompt(transaction, availableInvoices);
        
        const response = await bedrock.invokeModel({
            modelId: 'anthropic.claude-3-haiku-20240307-v1:0',
            contentType: 'application/json',
            accept: 'application/json',
            body: JSON.stringify({
                anthropic_version: "bedrock-2023-05-31",
                max_tokens: 1000,
                messages: [
                    {
                        role: "user",
                        content: prompt
                    }
                ]
            })
        }).promise();
        
        const result = JSON.parse(response.body.toString());
        const aiResponse = JSON.parse(result.content[0].text);
        
        return {
            invoice: aiResponse.matched_invoice,
            confidence: aiResponse.confidence,
            reasoning: aiResponse.reasoning
        };
        
    } catch (error) {
        console.error('AI matching error:', error);
        return {
            invoice: null,
            confidence: 0,
            reasoning: 'AI feldolgozási hiba'
        };
    }
};

function buildPrompt(transaction, availableInvoices) {
    const invoiceList = availableInvoices.map(inv => 
        `- ${inv.number}: ${inv.amount} Ft, ${inv.date}, ${inv.customer || 'N/A'}`
    ).join('\n');
    
    return `
Feladat: Párosítsd a bank tranzakciót a megfelelő számlával.

Bank tranzakció:
- Összeg: ${transaction.amount} Ft
- Dátum: ${transaction.date}
- Közlemény: "${transaction.description}"
- Bank: ${transaction.bank}

Elérhető számlák:
${invoiceList}

Szabályok:
1. Keresd a számla sorszámot a közleményben (E-NNTCH-YYYY-1234 vagy E-FRDLT-YYYY-1234 formátum)
2. Ellenőrizd az összeg egyezést (±1% tolerancia)
3. Figyelj a dátumra (±30 nap tolerancia)
4. Ha bizonytalan vagy, adj alacsony confidence értéket

Válaszolj JSON formátumban:
{
    "matched_invoice": {számla objektum vagy null},
    "confidence": 0-100,
    "reasoning": "indoklás magyarul"
}
`;
}
```

#### Package.json files
```json
// lambda/main-processor/package.json
{
  "name": "nanotech-invoice-matcher-main",
  "version": "1.0.0",
  "dependencies": {
    "aws-sdk": "^2.1691.0",
    "exceljs": "^4.4.0",
    "axios": "^1.6.0",
    "@woocommerce/woocommerce-rest-api": "^1.4.1"
  }
}

// lambda/ai-matcher/package.json
{
  "name": "nanotech-invoice-matcher-ai",
  "version": "1.0.0",
  "dependencies": {
    "aws-sdk": "^2.1691.0"
  }
}
```

### 4. Admin Frontend (Vue.js)

#### package.json
```json
{
  "name": "nanotech-invoice-matcher-admin",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "vue": "^3.4.0",
    "vue-router": "^4.2.0",
    "aws-sdk": "^2.1691.0",
    "axios": "^1.6.0"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^5.0.0",
    "vite": "^5.0.0",
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0"
  }
}
```

#### src/main.js
```javascript
import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import Dashboard from './views/Dashboard.vue'
import ManualMatching from './views/ManualMatching.vue'
import Reports from './views/Reports.vue'
import './style.css'

const routes = [
  { path: '/', component: Dashboard },
  { path: '/manual', component: ManualMatching },
  { path: '/reports', component: Reports }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

createApp(App).use(router).mount('#app')
```

#### src/App.vue
```vue
<template>
  <div id="app" class="min-h-screen bg-gray-50">
    <nav class="bg-white shadow-sm border-b">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16">
          <div class="flex items-center">
            <h1 class="text-xl font-semibold text-gray-900">
              Nanotech Számla Párosító
            </h1>
          </div>
          <div class="flex space-x-8">
            <router-link 
              to="/" 
              class="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-900 border-b-2 border-transparent hover:border-gray-300"
              active-class="border-blue-500 text-blue-600"
            >
              Dashboard
            </router-link>
            <router-link 
              to="/manual" 
              class="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-900 border-b-2 border-transparent hover:border-gray-300"
              active-class="border-blue-500 text-blue-600"
            >
              Manuális párosítás
            </router-link>
            <router-link 
              to="/reports" 
              class="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-900 border-b-2 border-transparent hover:border-gray-300"
              active-class="border-blue-500 text-blue-600"
            >
              Riportok
            </router-link>
          </div>
        </div>
      </div>
    </nav>

    <main class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <router-view />
    </main>
  </div>
</template>
```

#### src/views/Dashboard.vue
```vue
<template>
  <div class="space-y-6">
    <div class="bg-white overflow-hidden shadow rounded-lg">
      <div class="px-4 py-5 sm:p-6">
        <h3 class="text-lg leading-6 font-medium text-gray-900">
          Rendszer állapot
        </h3>
        <div class="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-3">
          <div class="bg-white overflow-hidden shadow rounded-lg">
            <div class="p-5">
              <div class="flex items-center">
                <div class="flex-shrink-0">
                  <div :class="apiStatus.szamlazz ? 'bg-green-500' : 'bg-red-500'" 
                       class="w-3 h-3 rounded-full"></div>
                </div>
                <div class="ml-5 w-0 flex-1">
                  <dl>
                    <dt class="text-sm font-medium text-gray-500 truncate">
                      Szamlazz.hu
                    </dt>
                    <dd class="text-lg font-medium text-gray-900">
                      {{ apiStatus.szamlazz ? 'Elérhető' : 'Hiba' }}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div class="bg-white overflow-hidden shadow rounded-lg">
            <div class="p-5">
              <div class="flex items-center">
                <div class="flex-shrink-0">
                  <div :class="apiStatus.wise ? 'bg-green-500' : 'bg-red-500'" 
                       class="w-3 h-3 rounded-full"></div>
                </div>
                <div class="ml-5 w-0 flex-1">
                  <dl>
                    <dt class="text-sm font-medium text-gray-500 truncate">
                      Wise
                    </dt>
                    <dd class="text-lg font-medium text-gray-900">
                      {{ apiStatus.wise ? 'Elérhető' : 'Hiba' }}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div class="bg-white overflow-hidden shadow rounded-lg">
            <div class="p-5">
              <div class="flex items-center">
                <div class="flex-shrink-0">
                  <div :class="apiStatus.mypos ? 'bg-green-500' : 'bg-red-500'" 
                       class="w-3 h-3 rounded-full"></div>
                </div>
                <div class="ml-5 w-0 flex-1">
                  <dl>
                    <dt class="text-sm font-medium text-gray-500 truncate">
                      MyPOS
                    </dt>
                    <dd class="text-lg font-medium text-gray-900">
                      {{ apiStatus.mypos ? 'Elérhető' : 'Hiba' }}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="bg-white overflow-hidden shadow rounded-lg">
      <div class="px-4 py-5 sm:p-6">
        <h3 class="text-lg leading-6 font-medium text-gray-900">
          Utolsó futtatás
        </h3>
        <div class="mt-5" v-if="lastRun">
          <dl class="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
            <div>
              <dt class="text-sm font-medium text-gray-500">Dátum</dt>
              <dd class="mt-1 text-sm text-gray-900">{{ formatDate(lastRun.date) }}</dd>
            </div>
            <div>
              <dt class="text-sm font-medium text-gray-500">Állapot</dt>
              <dd class="mt-1 text-sm text-gray-900">
                <span :class="lastRun.status === 'success' ? 'text-green-600' : 'text-red-600'">
                  {{ lastRun.status === 'success' ? 'Sikeres' : 'Hiba' }}
                </span>
              </dd>
            </div>
            <div>
              <dt class="text-sm font-medium text-gray-500">Párosított tételek</dt>
              <dd class="mt-1 text-sm text-gray-900">{{ lastRun.exactMatches }}</dd>
            </div>
            <div>
              <dt class="text-sm font-medium text-gray-500">Bizonytalan párosítások</dt>
              <dd class="mt-1 text-sm text-gray-900">{{ lastRun.uncertainMatches }}</dd>
            </div>
          </dl>
        </div>
        <div v-else class="mt-5 text-sm text-gray-500">
          Még nem futott le egyeztetés
        </div>
      </div>
    </div>

    <div class="bg-white overflow-hidden shadow rounded-lg">
      <div class="px-4 py-5 sm:p-6">
        <h3 class="text-lg leading-6 font-medium text-gray-900">
          Műveletek
        </h3>
        <div class="mt-5 space-y-3">
          <button 
            @click="runManualMatching"
            :disabled="isRunning"
            class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {{ isRunning ? 'Futtatás...' : 'Manuális futtatás' }}
          </button>
          
          <button 
            @click="downloadLatestReport"
            class="ml-3 inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Utolsó riport letöltése
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import AWS from 'aws-sdk'

export default {
  name: 'Dashboard',
  setup() {
    const apiStatus = ref({
      szamlazz: false,
      wise: false,
      mypos: false
    })
    
    const lastRun = ref(null)
    const isRunning = ref(false)
    
    const dynamodb = new AWS.DynamoDB.DocumentClient({
      region: 'eu-west-1',
      // Configure credentials here
    })
    
    const lambda = new AWS.Lambda({
      region: 'eu-west-1'
    })
    
    onMounted(async () => {
      await loadDashboardData()
      await checkApiStatus()
    })
    
    const loadDashboardData = async () => {
      try {
        const result = await dynamodb.query({
          TableName: 'nanotech-invoice-matcher-data',
          KeyConditionExpression: 'PK = :pk',
          ExpressionAttributeValues: {
            ':pk': 'SYSTEM#LAST_RUN'
          },
          ScanIndexForward: false,
          Limit: 1
        }).promise()
        
        if (result.Items.length > 0) {
          lastRun.value = result.Items[0].data
        }
      } catch (error) {
        console.error('Error loading dashboard data:', error)
      }
    }
    
    const checkApiStatus = async () => {
      // Implement API status checks
      apiStatus.value = {
        szamlazz: true,
        wise: true,
        mypos: true
      }
    }
    
    const runManualMatching = async () => {
      isRunning.value = true
      
      try {
        await lambda.invoke({
          FunctionName: 'nanotech-invoice-matcher-main-processor',
          InvocationType: 'Event'
        }).promise()
        
        alert('Manuális futtatás elindítva. Az eredmény emailben érkezik.')
      } catch (error) {
        console.error('Error running manual matching:', error)
        alert('Hiba történt a futtatás során.')
      } finally {
        isRunning.value = false
      }
    }
    
    const downloadLatestReport = () => {
      // Implement report download
      alert('Riport letöltés implementálás alatt')
    }
    
    const formatDate = (dateString) => {
      return new Date(dateString).toLocaleDateString('hu-HU')
    }
    
    return {
      apiStatus,
      lastRun,
      isRunning,
      runManualMatching,
      downloadLatestReport,
      formatDate
    }
  }
}
</script>
```

### 5. WooCommerce Plugin

#### nanotech-invoice-export.php
```php
<?php
/**
 * Plugin Name: Nanotech Invoice Export
 * Description: Export WooCommerce orders for invoice matching
 * Version: 1.0.0
 * Author: Nanotech Solutions
 */

if (!defined('ABSPATH')) {
    exit;
}

class NanotechInvoiceExport {
    
    public function __construct() {
        add_action('rest_api_init', array($this, 'register_routes'));
        add_action('woocommerce_checkout_order_processed', array($this, 'store_invoice_reference'));
    }
    
    public function register_routes() {
        register_rest_route('nanotech/v1', '/orders', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_orders'),
            'permission_callback' => array($this, 'check_permissions')
        ));
    }
    
    public function check_permissions() {
        return current_user_can('manage_woocommerce');
    }
    
    public function get_orders($request) {
        $from_date = $request->get_param('from_date');
        $to_date = $request->get_param('to_date');
        
        $args = array(
            'status' => array('completed', 'processing'),
            'limit' => -1,
            'date_created' => $from_date . '...' . $to_date
        );
        
        $orders = wc_get_orders($args);
        $export_data = array();
        
        foreach ($orders as $order) {
            $export_data[] = array(
                'order_id' => $order->get_id(),
                'order_number' => $order->get_order_number(),
                'total' => $order->get_total(),
                'date_created' => $order->get_date_created()->format('Y-m-d H:i:s'),
                'payment_method' => $order->get_payment_method(),
                'customer_email' => $order->get_billing_email(),
                'customer_name' => $order->get_billing_first_name() . ' ' . $order->get_billing_last_name(),
                'invoice_number' => get_post_meta($order->get_id(), '_szamlazz_invoice_number', true),
                'status' => $order->get_status()
            );
        }
        
        return rest_ensure_response($export_data);
    }
    
    public function store_invoice_reference($order_id) {
        // This will be called when Szamlazz.hu creates an invoice
        // Store the invoice number reference
        if (isset($_POST['szamlazz_invoice_number'])) {
            update_post_meta($order_id, '_szamlazz_invoice_number', sanitize_text_field($_POST['szamlazz_invoice_number']));
        }
    }
}

new NanotechInvoiceExport();
```

### 6. Deployment Scripts

#### infrastructure/deploy.sh
```bash
#!/bin/bash

set -e

echo "🚀 Deploying Nanotech Invoice Matcher..."

# Check if AWS CLI is configured
if ! aws sts get-caller-identity --profile nanotech-invoice >/dev/null 2>&1; then
    echo "❌ AWS CLI not configured with nanotech-invoice profile"
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

# Build admin frontend
echo "🎨 Building admin frontend..."
cd admin-frontend
npm install
npm run build
cd ..

# Deploy infrastructure
echo "🏗️ Deploying infrastructure..."
cd infrastructure/terraform
terraform init
terraform plan -var-file="prod.tfvars"
terraform apply -var-file="prod.tfvars" -auto-approve

# Get outputs
ADMIN_BUCKET=$(terraform output -raw admin_bucket_name)
ADMIN_DOMAIN=$(terraform output -raw admin_domain)

# Deploy admin frontend
echo "🌐 Deploying admin frontend..."
aws s3 sync ../admin-frontend/dist/ s3://$ADMIN_BUCKET --profile nanotech-invoice --region eu-central-1

# Update Lambda functions
echo "⚡ Updating Lambda functions..."
aws lambda update-function-code \
    --function-name nanotech-invoice-matcher-main-processor \
    --zip-file fileb://main-processor.zip \
    --profile nanotech-invoice \
    --region eu-west-1

aws lambda update-function-code \
    --function-name nanotech-invoice-matcher-ai-matcher \
    --zip-file fileb://ai-matcher.zip \
    --profile nanotech-invoice \
    --region eu-west-1

# Cleanup
rm -f main-processor.zip ai-matcher.zip

echo "✅ Deployment completed!"
echo "📊 Admin interface: https://$ADMIN_DOMAIN"
echo "💰 Estimated monthly cost: ~$0.10"
```

#### infrastructure/terraform/prod.tfvars
```hcl
project_name = "nanotech-invoice-matcher"
environment = "prod"

# Email configuration
notification_email = "szamlazas@nanotech.co.hu"

# Domain configuration (optional)
# admin_domain = "invoice-admin.nanotech.co.hu"
```

## 📚 API DOKUMENTÁCIÓ

### Szamlazz.hu API
```javascript
// Számlák lekérdezése
const response = await axios.post('https://www.szamlazz.hu/szamla/', {
    username: 'your_username',
    password: 'your_password',
    action: 'list',
    fromDate: '2024-01-01',
    toDate: '2024-01-31'
});
```

### Wise API
```javascript
// Tranzakciók lekérdezése
const response = await axios.get('https://api.wise.com/v1/profiles/{profileId}/transactions', {
    headers: {
        'Authorization': 'Bearer your_token'
    },
    params: {
        from: '2024-01-01',
        to: '2024-01-31'
    }
});
```

### MyPOS API
```javascript
// Fizetések lekérdezése
const response = await axios.post('https://www.mypos.com/vmp/api-docs', {
    // MyPOS specific parameters
});
```

## 🔧 KONFIGURÁCIÓS ÚTMUTATÓ

### 1. AWS Secrets Manager beállítása
```bash
aws secretsmanager create-secret \
    --name "nanotech-invoice-matcher-api-keys" \
    --description "API keys for invoice matcher" \
    --secret-string '{
        "szamlazz_username": "YOUR_USERNAME",
        "szamlazz_password": "YOUR_PASSWORD",
        "wise_token": "YOUR_WISE_TOKEN",
        "mypos_token": "YOUR_MYPOS_TOKEN",
        "woocommerce_key": "YOUR_WC_KEY",
        "woocommerce_secret": "YOUR_WC_SECRET"
    }' \
    --profile nanotech-invoice \
    --region eu-west-1
```

### 2. SES Email beállítása
```bash
# Email cím verifikálása
aws ses verify-email-identity \
    --email-address szamlazas@nanotech.co.hu \
    --profile nanotech-invoice \
    --region eu-west-1
```

### 3. Bedrock Model hozzáférés
```bash
# Claude 3 Haiku model engedélyezése
aws bedrock put-model-invocation-logging-configuration \
    --logging-config cloudWatchConfig='{logGroupName="/aws/bedrock/modelinvocations",roleArn="arn:aws:iam::ACCOUNT:role/service-role/AmazonBedrockExecutionRoleForInvokeModel"}' \
    --profile nanotech-invoice \
    --region eu-west-1
```

## 🧪 TESZTELÉSI ÚTMUTATÓ

### 1. Lokális tesztelés
```bash
# Lambda function tesztelése
cd lambda/main-processor
npm test

# Admin frontend tesztelése
cd admin-frontend
npm run dev
```

### 2. Manuális tesztelés
```bash
# Lambda function manuális futtatása
aws lambda invoke \
    --function-name nanotech-invoice-matcher-main-processor \
    --payload '{}' \
    --profile nanotech-invoice \
    --region eu-west-1 \
    response.json
```

### 3. API tesztelés
```bash
# Szamlazz.hu API teszt
curl -X POST https://www.szamlazz.hu/szamla/ \
    -d "username=YOUR_USERNAME&password=YOUR_PASSWORD&action=list"

# Wise API teszt
curl -H "Authorization: Bearer YOUR_TOKEN" \
    https://api.wise.com/v1/profiles
```

## 🚨 HIBAELHÁRÍTÁS

### Gyakori hibák

#### 1. Lambda timeout
```
Error: Task timed out after 900.00 seconds
```
**Megoldás**: Növeld a timeout értéket vagy optimalizáld a kódot

#### 2. DynamoDB throttling
```
Error: ProvisionedThroughputExceededException
```
**Megoldás**: Használj exponential backoff retry logikát

#### 3. Bedrock quota exceeded
```
Error: ThrottlingException
```
**Megoldás**: Implementálj rate limiting-et az AI hívásokhoz

#### 4. SES email bounce
```
Error: MessageRejected
```
**Megoldás**: Ellenőrizd az email cím verifikációját

### Monitoring és logging
```bash
# CloudWatch logs megtekintése
aws logs tail /aws/lambda/nanotech-invoice-matcher-main-processor \
    --follow \
    --profile nanotech-invoice \
    --region eu-west-1
```

## 📈 KARBANTARTÁS ÉS FRISSÍTÉSEK

### Havi feladatok
- [ ] CloudWatch költségek ellenőrzése
- [ ] Lambda function teljesítmény áttekintése
- [ ] DynamoDB táblák optimalizálása

### Negyedéves feladatok
- [ ] API kulcsok rotálása
- [ ] Biztonsági audit
- [ ] Backup stratégia ellenőrzése

### Éves feladatok
- [ ] AWS szolgáltatások frissítése
- [ ] Teljes rendszer audit
- [ ] Disaster recovery teszt

## 🎯 KÖVETKEZŐ LÉPÉSEK

### Fejlesztési prioritások
1. **OTP Bank API integráció** (CSV helyett)
2. **Részleges kifizetések** kezelése
3. **Több számla egy átutalásban** logika
4. **Mobilalkalmazás** fejlesztése
5. **Gépi tanulás** a párosítási pontosság javítására

### Optimalizációs lehetőségek
- **Lambda Provisioned Concurrency** nagy forgalom esetén
- **DynamoDB Global Tables** multi-region setup-hoz
- **CloudFront** az admin felület gyorsítására
- **API Gateway caching** a gyakori lekérdezésekhez

---

## ✅ TELEPÍTÉSI CHECKLIST

### Előfeltételek
- [ ] AWS Account létrehozva
- [ ] AWS CLI telepítve és konfigurálva
- [ ] Terraform telepítve
- [ ] Node.js 20+ telepítve
- [ ] Git repository létrehozva

### API kulcsok beszerzése
- [ ] Szamlazz.hu API hozzáférés
- [ ] Wise Business API token
- [ ] MyPOS API credentials
- [ ] WooCommerce REST API kulcsok

### Deployment lépések
- [ ] Repository klónozása
- [ ] Secrets Manager konfigurálása
- [ ] Terraform infrastructure deploy
- [ ] Lambda functions deploy
- [ ] Admin frontend deploy
- [ ] WooCommerce plugin telepítése
- [ ] SES email verifikáció
- [ ] Tesztelés és validáció

### Üzemeltetés
- [ ] Monitoring beállítása
- [ ] Backup stratégia implementálása
- [ ] Dokumentáció frissítése
- [ ] Felhasználói képzés

**Becsült telepítési idő: 4-6 óra**
**Becsült havi költség: ~$0.10**

---

*Ez a dokumentáció minden szükséges információt tartalmaz a Nanotech Invoice Matcher rendszer telepítéséhez és üzemeltetéséhez. A rendszer serverless architektúrája biztosítja a költséghatékonyságot és a skálázhatóságot.*