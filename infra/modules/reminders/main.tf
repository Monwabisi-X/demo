data "aws_caller_identity" "current" {}
data "aws_partition" "current" {}

locals {
  artifact_exists = var.enabled ? fileexists(var.artifact_path) : true
  artifact_hash = var.enabled ? (
    fileexists(var.artifact_path) ? filebase64sha256(var.artifact_path) : null
  ) : null
  log_group_name = "/${var.name_prefix}/${var.environment}/reminders"
}

data "aws_iam_policy_document" "assume" {
  count = var.enabled ? 1 : 0
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "this" {
  count              = var.enabled ? 1 : 0
  name               = "${var.name_prefix}-${var.environment}-reminders-role"
  assume_role_policy = data.aws_iam_policy_document.assume[0].json
}

data "aws_iam_policy_document" "runtime" {
  count = var.enabled ? 1 : 0

  statement {
    sid = "WriteDedicatedLogs"
    actions = [
      "logs:CreateLogStream",
      "logs:PutLogEvents"
    ]
    resources = ["arn:${data.aws_partition.current.partition}:logs:${var.region}:${data.aws_caller_identity.current.account_id}:log-group:${local.log_group_name}:*"]
  }

  statement {
    sid       = "ReadRdsManagedSecret"
    actions   = ["secretsmanager:GetSecretValue"]
    resources = [var.db_secret_arn]
  }

  statement {
    sid       = "DecryptRdsManagedSecret"
    actions   = ["kms:Decrypt"]
    resources = [var.kms_key_arn]
    condition {
      test     = "StringEquals"
      variable = "kms:ViaService"
      values   = ["secretsmanager.${var.region}.amazonaws.com"]
    }
  }

  statement {
    sid = "ManageLambdaNetworkInterfaces"
    actions = [
      "ec2:AssignPrivateIpAddresses",
      "ec2:CreateNetworkInterface",
      "ec2:DeleteNetworkInterface",
      "ec2:DescribeNetworkInterfaces",
      "ec2:DescribeSubnets",
      "ec2:UnassignPrivateIpAddresses"
    ]
    resources = ["*"]
  }

  dynamic "statement" {
    for_each = var.redis_tls ? [1] : []
    content {
      sid     = "ConnectToSelectedRedisIamUser"
      actions = ["elasticache:Connect"]
      resources = [
        var.redis_replication_group_arn,
        var.redis_user_arn
      ]
    }
  }
}

resource "aws_iam_role_policy" "runtime" {
  count  = var.enabled ? 1 : 0
  name   = "${var.name_prefix}-${var.environment}-reminders-runtime"
  role   = aws_iam_role.this[0].id
  policy = data.aws_iam_policy_document.runtime[0].json
}

resource "aws_cloudwatch_log_group" "this" {
  count             = var.enabled ? 1 : 0
  name              = local.log_group_name
  retention_in_days = var.log_retention_days
  kms_key_id        = var.kms_key_arn
}

resource "aws_security_group" "this" {
  count       = var.enabled ? 1 : 0
  name_prefix = "${var.name_prefix}-${var.environment}-reminders-"
  description = "Dedicated reminder Lambda egress"
  vpc_id      = var.vpc_id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  lifecycle { create_before_destroy = true }
  tags = { Name = "${var.name_prefix}-${var.environment}-reminders-sg" }
}

resource "aws_vpc_security_group_ingress_rule" "database" {
  count                        = var.enabled ? 1 : 0
  security_group_id            = var.db_security_group_id
  referenced_security_group_id = aws_security_group.this[0].id
  from_port                    = var.db_port
  to_port                      = var.db_port
  ip_protocol                  = "tcp"
  description                  = "PostgreSQL from reminder Lambda"
}

resource "aws_vpc_security_group_ingress_rule" "redis" {
  count                        = var.enabled ? 1 : 0
  security_group_id            = var.redis_security_group_id
  referenced_security_group_id = aws_security_group.this[0].id
  from_port                    = var.redis_port
  to_port                      = var.redis_port
  ip_protocol                  = "tcp"
  description                  = "Redis from reminder Lambda"
}

resource "aws_lambda_function" "this" {
  count                          = var.enabled ? 1 : 0
  function_name                  = "${var.name_prefix}-${var.environment}-reminders"
  description                    = "Materialises due reminder notifications and reconciles the durable outbox"
  role                           = aws_iam_role.this[0].arn
  runtime                        = "nodejs20.x"
  architectures                  = ["x86_64"]
  handler                        = "lambda/reminders/handler.handler"
  filename                       = var.artifact_path
  source_code_hash               = local.artifact_hash
  memory_size                    = 512
  timeout                        = 60
  reserved_concurrent_executions = 1

  vpc_config {
    subnet_ids         = var.private_subnet_ids
    security_group_ids = [aws_security_group.this[0].id]
  }

  environment {
    variables = {
      NODE_ENV           = "production"
      LOG_LEVEL          = "info"
      DB_SECRET_ARN      = var.db_secret_arn
      DB_NAME            = var.db_name
      DB_SSL             = "true"
      DB_POOL_MIN        = "0"
      DB_POOL_MAX        = "2"
      REDIS_HOST         = var.redis_host
      REDIS_PORT         = tostring(var.redis_port)
      REDIS_TLS          = tostring(var.redis_tls)
      REDIS_AUTH_MODE    = var.redis_auth_mode
      REDIS_USERNAME     = var.redis_username
      REDIS_IAM_RESOURCE = var.redis_iam_resource
    }
  }

  lifecycle {
    precondition {
      condition     = local.artifact_exists
      error_message = "Build the reminder artifact with backend/scripts/build-reminder-lambda.sh before enabling the scheduler."
    }
  }

  depends_on = [
    aws_cloudwatch_log_group.this,
    aws_iam_role_policy.runtime,
    aws_vpc_security_group_ingress_rule.database,
    aws_vpc_security_group_ingress_rule.redis
  ]
}
