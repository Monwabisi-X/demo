# KMS keys, security groups, and IAM roles. KMS keys use a short deletion window and rotation.

# ── KMS: application data (S3, RDS, general envelope encryption) ───────────────────
resource "aws_kms_key" "app" {
  description             = "${var.name_prefix}-${var.environment} application data key"
  deletion_window_in_days = 7
  enable_key_rotation     = true
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
