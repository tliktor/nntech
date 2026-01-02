output "admin_bucket_name" {
  value = aws_s3_bucket.admin_frontend.bucket
}

output "admin_domain" {
  value = aws_s3_bucket_website_configuration.admin_frontend.website_endpoint
}

output "reports_bucket" {
  value = aws_s3_bucket.reports.bucket
}

output "dynamodb_table" {
  value = aws_dynamodb_table.invoices.name
}

output "main_lambda_arn" {
  value = aws_lambda_function.main_processor.arn
}

output "secrets_arn" {
  value = aws_secretsmanager_secret.api_keys.arn
}