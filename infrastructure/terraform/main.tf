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
  profile = "nntech-developer"
}

provider "aws" {
  alias   = "eu-central"
  region  = "eu-central-1"
  profile = "nntech-developer"
}

variable "project_name" {
  default = "nntech-invoice-matcher"
}

variable "environment" {
  default = "dev"
}

resource "random_id" "bucket_suffix" {
  byte_length = 4
}