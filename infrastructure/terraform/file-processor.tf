# File Processor Lambda
resource "aws_lambda_function" "file_processor" {
  filename         = "file-processor.zip"
  function_name    = "${var.project_name}-file-processor"
  role            = aws_iam_role.lambda_role.arn
  handler         = "index.handler"
  runtime         = "nodejs22.x"
  timeout         = 300
  memory_size     = 512

  environment {
    variables = {
      S3_BUCKET = aws_s3_bucket.reports.bucket
    }
  }

  depends_on = [aws_iam_role_policy.lambda_policy]
}

# API Gateway resources for file processing
resource "aws_api_gateway_resource" "process_files" {
  rest_api_id = aws_api_gateway_rest_api.api_tester.id
  parent_id   = aws_api_gateway_rest_api.api_tester.root_resource_id
  path_part   = "process-files"
}

resource "aws_api_gateway_resource" "manual_run" {
  rest_api_id = aws_api_gateway_rest_api.api_tester.id
  parent_id   = aws_api_gateway_rest_api.api_tester.root_resource_id
  path_part   = "manual-run"
}

# POST methods for file processing
resource "aws_api_gateway_method" "process_files_post" {
  rest_api_id   = aws_api_gateway_rest_api.api_tester.id
  resource_id   = aws_api_gateway_resource.process_files.id
  http_method   = "POST"
  authorization = "NONE"
}

resource "aws_api_gateway_method" "manual_run_post" {
  rest_api_id   = aws_api_gateway_rest_api.api_tester.id
  resource_id   = aws_api_gateway_resource.manual_run.id
  http_method   = "POST"
  authorization = "NONE"
}

# OPTIONS methods for CORS
resource "aws_api_gateway_method" "process_files_options" {
  rest_api_id   = aws_api_gateway_rest_api.api_tester.id
  resource_id   = aws_api_gateway_resource.process_files.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_method" "manual_run_options" {
  rest_api_id   = aws_api_gateway_rest_api.api_tester.id
  resource_id   = aws_api_gateway_resource.manual_run.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

# Integrations
resource "aws_api_gateway_integration" "process_files_integration" {
  rest_api_id = aws_api_gateway_rest_api.api_tester.id
  resource_id = aws_api_gateway_resource.process_files.id
  http_method = aws_api_gateway_method.process_files_post.http_method

  integration_http_method = "POST"
  type                   = "AWS_PROXY"
  uri                    = aws_lambda_function.file_processor.invoke_arn
}

resource "aws_api_gateway_integration" "manual_run_integration" {
  rest_api_id = aws_api_gateway_rest_api.api_tester.id
  resource_id = aws_api_gateway_resource.manual_run.id
  http_method = aws_api_gateway_method.manual_run_post.http_method

  integration_http_method = "POST"
  type                   = "AWS_PROXY"
  uri                    = aws_lambda_function.file_processor.invoke_arn
}

# Lambda permissions
resource "aws_lambda_permission" "file_processor_permission" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.file_processor.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.api_tester.execution_arn}/*/*"
}