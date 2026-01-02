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
          "logs:DescribeLogGroups",
          "logs:DescribeLogStreams",
          "dynamodb:*",
          "s3:*",
          "bedrock:InvokeModel",
          "bedrock:InvokeModelWithResponseStream",
          "ses:SendEmail",
          "lambda:InvokeFunction",
          "secretsmanager:GetSecretValue"
        ]
        Resource = [
          "*",
          "arn:aws:bedrock:eu-west-1:*:inference-profile/eu.anthropic.claude-*",
          "arn:aws:bedrock:eu-central-1::foundation-model/anthropic.claude-*",
          "arn:aws:bedrock:eu-west-1::foundation-model/anthropic.claude-*",
          "arn:aws:bedrock:eu-north-1::foundation-model/anthropic.claude-*"
        ]
      }
    ]
  })
}

resource "aws_cloudwatch_log_group" "lambda_logs" {
  for_each = {
    main-processor = aws_lambda_function.main_processor.function_name
    ai-matcher = aws_lambda_function.ai_matcher.function_name
    file-processor = aws_lambda_function.file_processor.function_name
    api-tester = aws_lambda_function.api_tester.function_name
  }
  
  name              = "/aws/lambda/${each.value}"
  retention_in_days = 14
}

resource "aws_cloudwatch_metric_alarm" "lambda_errors" {
  for_each = {
    main-processor = aws_lambda_function.main_processor.function_name
    ai-matcher = aws_lambda_function.ai_matcher.function_name
  }
  
  alarm_name          = "${each.value}-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = "300"
  statistic           = "Sum"
  threshold           = "1"
  alarm_description   = "Lambda function ${each.value} error rate"
  
  dimensions = {
    FunctionName = each.value
  }
}

resource "aws_lambda_function" "main_processor" {
  filename         = "main-processor.zip"
  function_name    = "${var.project_name}-main-processor"
  role            = aws_iam_role.lambda_role.arn
  handler         = "index.handler"
  runtime         = "nodejs22.x"
  timeout         = 900
  memory_size     = 512

  environment {
    variables = {
      DYNAMODB_TABLE = aws_dynamodb_table.invoices.name
      S3_BUCKET      = aws_s3_bucket.reports.bucket
      AI_LAMBDA_ARN  = aws_lambda_function.ai_matcher.arn
      SECRETS_ARN    = aws_secretsmanager_secret.api_keys.arn
    }
  }

  depends_on = [aws_iam_role_policy.lambda_policy]
}

resource "aws_lambda_function" "ai_matcher" {
  filename         = "ai-matcher.zip"
  function_name    = "${var.project_name}-ai-matcher"
  role            = aws_iam_role.lambda_role.arn
  handler         = "index.handler"
  runtime         = "nodejs22.x"
  timeout         = 300
  memory_size     = 256

  depends_on = [aws_iam_role_policy.lambda_policy]
}

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