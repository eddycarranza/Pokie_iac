terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.4"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# Fix CKV_AWS_144: provider secundario en otra región para la réplica de los
# buckets S3 (disaster recovery / cross-region replication).
provider "aws" {
  alias  = "replica"
  region = var.replica_region
}
