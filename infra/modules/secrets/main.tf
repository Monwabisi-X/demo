# Secrets Manager secret CONTAINERS only. Terraform creates the secrets and their KMS
# encryption; it NEVER sets the values. Values (DB password, JWT secret, encryption key, Smile
# ID API key, per-provider webhook secrets) are injected out-of-band:
#   - In CI: a GitHub Actions job with OIDC writes them via `aws secretsmanager put-secret-value`
#     from GitHub Encrypted Secrets.
#   - Manually: an operator sets them once in the console/CLI.
# Because no `aws_secretsmanager_secret_version` is declared here, no secret value is ever in
# the Terraform code or state as plaintext.

locals {
  secret_names = [
    "db-password",      # RDS master password
    "jwt-secret",       # backend JWT signing secret (>=32 chars)
    "encryption-key",   # app-level field encryption key (envelope via KMS in prod)
    "smile-id-api-key", # Smile ID partner API key for identity verification
    "provider-webhooks" # JSON map of per-provider inbound webhook HMAC secrets
  ]
}

resource "aws_secretsmanager_secret" "this" {
  for_each    = toset(local.secret_names)
  name        = "${var.name_prefix}/${var.environment}/${each.value}"
  description = "Value injected out-of-band (CI/GitHub Secrets or manual). Never committed."
  kms_key_id  = var.kms_key_arn
  tags        = { Name = "${var.name_prefix}-${var.environment}-${each.value}" }
}
