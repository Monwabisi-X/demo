resource "aws_ecr_repository" "backend" {
  count                = var.enabled ? 1 : 0
  name                 = "${var.name_prefix}/${var.environment}/backend"
  image_tag_mutability = "IMMUTABLE"
  force_delete         = false

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "KMS"
    kms_key         = var.kms_key_arn
  }

  tags = { Name = "${var.name_prefix}-${var.environment}-backend" }
}
