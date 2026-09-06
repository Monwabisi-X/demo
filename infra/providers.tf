provider "aws" {
  region = var.region

  # Data residency: default af-south-1 (Cape Town) for POPIA §72. No credentials are set here;
  # they come from the environment / an assumed role in CI (GitHub OIDC) — never committed.

  default_tags {
    tags = {
      Project     = "royal-square-financial"
      Environment = var.environment
      ManagedBy   = "terraform"
      CostCenter  = "platform"
    }
  }
}
