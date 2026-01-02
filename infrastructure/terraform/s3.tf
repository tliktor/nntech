resource "aws_s3_bucket" "reports" {
  bucket = "${var.project_name}-reports-${random_id.bucket_suffix.hex}"
}

resource "aws_s3_bucket_versioning" "reports" {
  bucket = aws_s3_bucket.reports.id
  versioning_configuration {
    status = "Enabled"
  }
}

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

resource "aws_secretsmanager_secret" "api_keys" {
  name = "${var.project_name}-api-keys"
}

resource "aws_secretsmanager_secret_version" "api_keys" {
  secret_id = aws_secretsmanager_secret.api_keys.id
  secret_string = jsonencode({
    mypos_key_1 = "aJwmyL6ENyckSgz6vCvu5nd0"
    mypos_key_2 = "V30tpym4qHQR605ft1RMLJZY0ywrDecaPvBYcND5MhTb1LL4"
    wise_token = "8718e5d5-6075-4afa-a50d-2960d0223f47"
    szamlazz_token = "01050yqnq427vbvprn7a9jy7vbvprtad8e47vbvprk"
    woocommerce_key = "ck_1d6d7bdca307fd5d00a09bdf8b27382faf7af209"
    woocommerce_secret = "cs_37a31b114ce9c9be94cdc2d7593edf923b9b70d3"
  })
}