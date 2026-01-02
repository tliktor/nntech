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
    name               = "GSI1"
    hash_key           = "GSI1PK"
    range_key          = "GSI1SK"
    projection_type    = "ALL"
  }

  tags = {
    Name = "${var.project_name}-data"
    Environment = var.environment
  }
}

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