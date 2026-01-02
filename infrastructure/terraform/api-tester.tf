resource "aws_lambda_function" "api_tester" {
  filename         = "../../lambda/api-tester/api-tester.zip"
  function_name    = "nntech-invoice-matcher-api-tester"
  role            = aws_iam_role.lambda_role.arn
  handler         = "index.handler"
  runtime         = "nodejs22.x"
  timeout         = 30

  depends_on = [data.archive_file.api_tester_zip]
}

data "archive_file" "api_tester_zip" {
  type        = "zip"
  source_dir  = "../../lambda/api-tester"
  output_path = "../../lambda/api-tester/api-tester.zip"
}

resource "aws_api_gateway_rest_api" "api_tester" {
  name = "nntech-invoice-matcher-api-tester"
}

resource "aws_api_gateway_resource" "test_szamlazz" {
  rest_api_id = aws_api_gateway_rest_api.api_tester.id
  parent_id   = aws_api_gateway_rest_api.api_tester.root_resource_id
  path_part   = "test-szamlazz"
}

resource "aws_api_gateway_resource" "test_wise" {
  rest_api_id = aws_api_gateway_rest_api.api_tester.id
  parent_id   = aws_api_gateway_rest_api.api_tester.root_resource_id
  path_part   = "test-wise"
}

resource "aws_api_gateway_resource" "test_mypos" {
  rest_api_id = aws_api_gateway_rest_api.api_tester.id
  parent_id   = aws_api_gateway_rest_api.api_tester.root_resource_id
  path_part   = "test-mypos"
}

resource "aws_api_gateway_resource" "test_woocommerce" {
  rest_api_id = aws_api_gateway_rest_api.api_tester.id
  parent_id   = aws_api_gateway_rest_api.api_tester.root_resource_id
  path_part   = "test-woocommerce"
}

resource "aws_api_gateway_method" "test_methods" {
  for_each = {
    szamlazz     = aws_api_gateway_resource.test_szamlazz.id
    wise         = aws_api_gateway_resource.test_wise.id
    mypos        = aws_api_gateway_resource.test_mypos.id
    woocommerce  = aws_api_gateway_resource.test_woocommerce.id
  }

  rest_api_id   = aws_api_gateway_rest_api.api_tester.id
  resource_id   = each.value
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "test_integrations" {
  for_each = {
    szamlazz     = aws_api_gateway_resource.test_szamlazz.id
    wise         = aws_api_gateway_resource.test_wise.id
    mypos        = aws_api_gateway_resource.test_mypos.id
    woocommerce  = aws_api_gateway_resource.test_woocommerce.id
  }

  rest_api_id = aws_api_gateway_rest_api.api_tester.id
  resource_id = each.value
  http_method = aws_api_gateway_method.test_methods[each.key].http_method

  integration_http_method = "POST"
  type                   = "AWS_PROXY"
  uri                    = aws_lambda_function.api_tester.invoke_arn
}

resource "aws_lambda_permission" "api_tester_permission" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.api_tester.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.api_tester.execution_arn}/*/*"
}

resource "aws_api_gateway_deployment" "api_tester" {
  depends_on = [
    aws_api_gateway_integration.test_integrations
  ]

  rest_api_id = aws_api_gateway_rest_api.api_tester.id
  stage_name  = "prod"
}

output "api_tester_url" {
  value = aws_api_gateway_deployment.api_tester.invoke_url
}