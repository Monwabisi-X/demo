terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.60"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.4"
    }
  }

  # Remote state is intentionally NOT configured here. Configure a backend (e.g. S3 + DynamoDB
  # lock) out-of-band per environment before running against real AWS. Everything in this
  # repository is plan-only: `init -backend=false` + `validate` + `plan`. There is NO apply.
}
