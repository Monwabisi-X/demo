# KMS keys, security groups, and IAM roles. KMS keys use a short deletion window and rotation.

data "aws_caller_identity" "current" {}
data "aws_partition" "current" {}

locals {
  account_root_arn     = "arn:${data.aws_partition.current.partition}:iam::${data.aws_caller_identity.current.account_id}:root"
  autoscaling_role_arn = "arn:${data.aws_partition.current.partition}:iam::${data.aws_caller_identity.current.account_id}:role/aws-service-role/autoscaling.amazonaws.com/AWSServiceRoleForAutoScaling"
}

# Explicit key policies retain account-root delegation so authorised IAM policies continue to
# work, while granting AWS services only the operations they require. This avoids accidental
# KMS lockout when service-specific statements are added.
data "aws_iam_policy_document" "app_kms" {
  statement {
    sid       = "EnableAccountRootDelegation"
    actions   = ["kms:*"]
    resources = ["*"]
    principals {
      type        = "AWS"
      identifiers = [local.account_root_arn]
    }
  }

  statement {
    sid = "AllowCloudWatchLogs"
    actions = [
      "kms:Decrypt*",
      "kms:Describe*",
      "kms:Encrypt*",
      "kms:GenerateDataKey*",
      "kms:ReEncrypt*"
    ]
    resources = ["*"]
    principals {
      type        = "Service"
      identifiers = ["logs.${var.region}.amazonaws.com"]
    }
    condition {
      test     = "ArnLike"
      variable = "kms:EncryptionContext:aws:logs:arn"
      values = [
        "arn:${data.aws_partition.current.partition}:logs:${var.region}:${data.aws_caller_identity.current.account_id}:log-group:/${var.name_prefix}/${var.environment}/*"
      ]
    }
  }

  statement {
    sid = "AllowAutoScalingEncryptedVolumes"
    actions = [
      "kms:Decrypt",
      "kms:DescribeKey",
      "kms:Encrypt",
      "kms:GenerateDataKey*",
      "kms:ReEncrypt*"
    ]
    resources = ["*"]
    principals {
      type        = "AWS"
      identifiers = [local.account_root_arn]
    }
    condition {
      test     = "ArnLike"
      variable = "aws:PrincipalArn"
      values   = [local.autoscaling_role_arn]
    }
  }

  statement {
    sid       = "AllowAutoScalingGrant"
    actions   = ["kms:CreateGrant"]
    resources = ["*"]
    principals {
      type        = "AWS"
      identifiers = [local.account_root_arn]
    }
    condition {
      test     = "ArnLike"
      variable = "aws:PrincipalArn"
      values   = [local.autoscaling_role_arn]
    }
    condition {
      test     = "Bool"
      variable = "kms:GrantIsForAWSResource"
      values   = ["true"]
    }
  }

  dynamic "statement" {
    for_each = var.enable_scheduler ? [1] : []
    content {
      sid = "AllowSchedulerForEncryptedDlq"
      actions = [
        "kms:Decrypt",
        "kms:GenerateDataKey*"
      ]
      resources = ["*"]
      principals {
        type        = "Service"
        identifiers = ["scheduler.amazonaws.com"]
      }
      condition {
        test     = "StringEquals"
        variable = "AWS:SourceAccount"
        values   = [data.aws_caller_identity.current.account_id]
      }
    }
  }
}

data "aws_iam_policy_document" "medical_kms" {
  statement {
    sid       = "EnableAccountRootDelegation"
    actions   = ["kms:*"]
    resources = ["*"]
    principals {
      type        = "AWS"
      identifiers = [local.account_root_arn]
    }
  }
}

# ── KMS: application data (S3, RDS, general envelope encryption) ───────────────────
resource "aws_kms_key" "app" {
  description             = "${var.name_prefix}-${var.environment} application data key"
  deletion_window_in_days = 7
  enable_key_rotation     = true
  policy                  = data.aws_iam_policy_document.app_kms.json
}

resource "aws_kms_alias" "app" {
  name          = "alias/${var.name_prefix}-${var.environment}-app"
  target_key_id = aws_kms_key.app.key_id
}

# Separate key for special personal information (medical) per the app's data classification.
resource "aws_kms_key" "medical" {
  description             = "${var.name_prefix}-${var.environment} special personal information key"
  deletion_window_in_days = 7
  enable_key_rotation     = true
  policy                  = data.aws_iam_policy_document.medical_kms.json
}

resource "aws_kms_alias" "medical" {
  name          = "alias/${var.name_prefix}-${var.environment}-medical"
  target_key_id = aws_kms_key.medical.key_id
}

# ── Security groups ───────────────────────────────────────────────────────────────
resource "aws_security_group" "alb" {
  name_prefix = "${var.name_prefix}-${var.environment}-alb-"
  description = "ALB ingress (HTTPS/HTTP) from the internet"
  vpc_id      = var.vpc_id

  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  ingress {
    description = "HTTP (redirect to HTTPS at the listener)"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  lifecycle { create_before_destroy = true }
  tags = { Name = "${var.name_prefix}-${var.environment}-alb-sg" }
}

resource "aws_security_group" "app" {
  name_prefix = "${var.name_prefix}-${var.environment}-app-"
  description = "App instances: accept API traffic only from the ALB"
  vpc_id      = var.vpc_id

  ingress {
    description     = "API from ALB"
    from_port       = 3000
    to_port         = 3000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  lifecycle { create_before_destroy = true }
  tags = { Name = "${var.name_prefix}-${var.environment}-app-sg" }
}

resource "aws_security_group" "db" {
  name_prefix = "${var.name_prefix}-${var.environment}-db-"
  description = "RDS: accept PostgreSQL only from the app SG"
  vpc_id      = var.vpc_id

  ingress {
    description     = "PostgreSQL from app"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]
  }
  lifecycle { create_before_destroy = true }
  tags = { Name = "${var.name_prefix}-${var.environment}-db-sg" }
}

resource "aws_security_group" "redis" {
  name_prefix = "${var.name_prefix}-${var.environment}-redis-"
  description = "ElastiCache Redis: accept only from the app SG"
  vpc_id      = var.vpc_id

  ingress {
    description     = "Redis from app"
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]
  }
  lifecycle { create_before_destroy = true }
  tags = { Name = "${var.name_prefix}-${var.environment}-redis-sg" }
}

# ── IAM: EC2 instance role (least privilege; S3/KMS/Secrets read scoped in prod) ──
data "aws_iam_policy_document" "ec2_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "app" {
  name               = "${var.name_prefix}-${var.environment}-app-role"
  assume_role_policy = data.aws_iam_policy_document.ec2_assume.json
}

resource "aws_iam_instance_profile" "app" {
  name = "${var.name_prefix}-${var.environment}-app-profile"
  role = aws_iam_role.app.name
}

# Managed policy for SSM Session Manager access (no SSH keys / bastion needed).
resource "aws_iam_role_policy_attachment" "app_ssm" {
  role       = aws_iam_role.app.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

# ── IAM: Lambda execution role ────────────────────────────────────────────────────
data "aws_iam_policy_document" "lambda_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "lambda" {
  name               = "${var.name_prefix}-${var.environment}-lambda-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume.json
}

resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}
