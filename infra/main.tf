# ──────────────────────────────────────────────────────────────────────────────
# Root composition. Wires the modules together. Billable resources are gated behind
# the enable_* toggles in variables.tf and default to the cheapest safe posture.
#
# Plan-only: run `terraform init -backend=false && terraform validate && terraform plan`.
# There is NO apply in this repository.
# ──────────────────────────────────────────────────────────────────────────────

data "aws_caller_identity" "current" {}
data "aws_partition" "current" {}

resource "terraform_data" "redis_tls_configuration" {
  count = var.enable_redis_tls || var.use_redis_tls ? 1 : 0
  input = "validated"

  lifecycle {
    precondition {
      condition     = !var.use_redis_tls || var.enable_redis_tls
      error_message = "use_redis_tls=true requires enable_redis_tls=true."
    }

    precondition {
      condition     = !var.enable_redis_tls || var.enable_redis
      error_message = "The additive TLS migration requires enable_redis=true so the legacy rollback source cannot be removed by a tfvars-only change. Legacy retirement requires a separate code review."
    }
  }
}

check "compute_dependencies" {
  assert {
    condition = !var.enable_ec2_alb || (
      var.enable_container_registry &&
      var.enable_rds &&
      (var.use_redis_tls ? var.enable_redis_tls : var.enable_redis)
    )
    error_message = "enable_ec2_alb=true requires enable_container_registry, enable_rds, and the selected Redis deployment (legacy or TLS) so the API can pass readiness checks."
  }

  assert {
    condition = !var.enable_ec2_alb || var.enable_nat_gateway || (
      var.enable_vpc_endpoints && alltrue([
        for service in [
          "ec2messages",
          "ecr.api",
          "ecr.dkr",
          "kms",
          "logs",
          "secretsmanager",
          "ssm",
          "ssmmessages"
        ] : contains(var.interface_endpoint_services, service)
      ])
    )
    error_message = "Private EC2 runtime without NAT requires the ECR, Secrets Manager, KMS, Logs, and SSM interface endpoints listed in terraform.tfvars.example."
  }
}

# A resource precondition is intentionally used instead of an advisory check: invalid Koisa
# configuration must block planning before any runtime or IAM change can proceed.
resource "terraform_data" "koisa_configuration" {
  count = var.enable_koisa ? 1 : 0
  input = "validated"

  lifecycle {
    precondition {
      condition = (
        var.enable_ec2_alb &&
        var.bedrock_region != "" &&
        var.bedrock_region == var.region &&
        var.bedrock_model_id != "" &&
        length(var.bedrock_invoke_resource_arns) > 0 &&
        var.koisa_tool_timeout_ms < var.koisa_overall_timeout_ms &&
        alltrue([
          for arn in var.bedrock_invoke_resource_arns :
          try(split(":", arn)[3], "") == var.bedrock_region
        ])
      )
      error_message = "enable_koisa=true requires enable_ec2_alb plus an explicit in-deployment-region Bedrock region/model, at least one exact in-region invoke resource ARN, and a tool timeout below the overall timeout."
    }

    precondition {
      condition = var.enable_nat_gateway || (
        var.enable_vpc_endpoints && contains(var.interface_endpoint_services, "bedrock-runtime")
      )
      error_message = "Koisa without NAT requires enable_vpc_endpoints=true and the bedrock-runtime interface endpoint."
    }
  }
}

resource "terraform_data" "reminder_scheduler_configuration" {
  count = var.enable_scheduler ? 1 : 0
  input = "validated"

  lifecycle {
    precondition {
      condition = (
        var.enable_ec2_alb &&
        var.enable_rds &&
        (var.use_redis_tls ? var.enable_redis_tls : var.enable_redis)
      )
      error_message = "enable_scheduler=true requires enable_ec2_alb=true, enable_rds=true, and the selected Redis deployment (legacy or TLS)."
    }

    precondition {
      condition = var.enable_nat_gateway || (
        var.enable_vpc_endpoints && contains(var.interface_endpoint_services, "secretsmanager")
      )
      error_message = "The reminder Lambda requires NAT or the Secrets Manager interface endpoint to read the RDS-managed secret. ECR is not required."
    }
  }
}

check "api_dns_configuration" {
  assert {
    condition     = (var.api_domain_name == "") == (var.route53_zone_id == "")
    error_message = "api_domain_name and route53_zone_id must either both be set or both be empty."
  }
}

module "network" {
  source                      = "./modules/network"
  name_prefix                 = var.name_prefix
  environment                 = var.environment
  vpc_cidr                    = var.vpc_cidr
  az_count                    = var.az_count
  enable_nat_gateway          = var.enable_nat_gateway
  enable_vpc_endpoints        = var.enable_vpc_endpoints
  interface_endpoint_services = var.interface_endpoint_services
  region                      = var.region
}

module "security" {
  source           = "./modules/security"
  name_prefix      = var.name_prefix
  environment      = var.environment
  vpc_id           = module.network.vpc_id
  vpc_cidr         = var.vpc_cidr
  region           = var.region
  enable_scheduler = var.enable_scheduler
}

module "secrets" {
  source      = "./modules/secrets"
  name_prefix = var.name_prefix
  environment = var.environment
  kms_key_arn = module.security.kms_app_key_arn
}

module "storage" {
  source            = "./modules/storage"
  name_prefix       = var.name_prefix
  environment       = var.environment
  kms_key_arn       = module.security.kms_app_key_arn
  enable_cloudfront = var.enable_cloudfront
}

# Static frontend delivery is intentionally isolated from the document bucket and the
# stage-one legacy document CloudFront resources controlled by enable_cloudfront.
module "frontend_delivery" {
  source      = "./modules/frontend_delivery"
  name_prefix = var.name_prefix
  environment = var.environment
  enabled     = var.enable_frontend_delivery
}

module "registry" {
  source      = "./modules/registry"
  name_prefix = var.name_prefix
  environment = var.environment
  enabled     = var.enable_container_registry
  kms_key_arn = module.security.kms_app_key_arn
}

module "database" {
  source             = "./modules/database"
  name_prefix        = var.name_prefix
  environment        = var.environment
  enable_rds         = var.enable_rds
  private_subnet_ids = module.network.private_subnet_ids
  db_sg_id           = module.security.db_sg_id
  kms_key_arn        = module.security.kms_app_key_arn
  instance_class     = var.db_instance_class
  allocated_storage  = var.db_allocated_storage
  multi_az           = var.db_multi_az
  db_name            = var.db_name
  db_username        = var.db_username
}

module "redis" {
  source                      = "./modules/redis"
  name_prefix                 = var.name_prefix
  environment                 = var.environment
  enable_redis                = var.enable_redis
  enable_redis_tls            = var.enable_redis_tls
  use_redis_tls               = var.use_redis_tls
  private_subnet_ids          = module.network.private_subnet_ids
  redis_sg_id                 = module.security.redis_sg_id
  node_type                   = var.redis_node_type
  kms_key_arn                 = module.security.kms_app_key_arn
  tls_num_cache_clusters      = var.redis_tls_num_cache_clusters
  tls_snapshot_retention_days = var.redis_tls_snapshot_retention_days
  tls_initial_snapshot_name   = var.redis_tls_initial_snapshot_name
}

data "aws_iam_policy_document" "app_runtime" {
  count = var.enable_ec2_alb ? 1 : 0

  statement {
    sid       = "ECRLogin"
    actions   = ["ecr:GetAuthorizationToken"]
    resources = ["*"]
  }

  statement {
    sid = "ReadBackendImage"
    actions = [
      "ecr:BatchCheckLayerAvailability",
      "ecr:BatchGetImage",
      "ecr:GetDownloadUrlForLayer"
    ]
    resources = [module.registry.repository_arn]
  }

  statement {
    sid     = "ReadRuntimeSecrets"
    actions = ["secretsmanager:GetSecretValue"]
    resources = [
      module.database.master_user_secret_arn,
      module.secrets.secret_arns["jwt-secret"],
      module.secrets.secret_arns["encryption-key"],
      module.secrets.secret_arns["smile-id-api-key"],
      module.secrets.secret_arns["provider-webhooks"],
      module.secrets.secret_arns["integration-santam"],
      module.secrets.secret_arns["integration-sars"]
    ]
  }

  statement {
    sid = "UseApplicationKeys"
    actions = [
      "kms:Decrypt",
      "kms:DescribeKey",
      "kms:GenerateDataKey"
    ]
    resources = [
      module.security.kms_app_key_arn,
      module.security.kms_medical_key_arn
    ]
  }

  statement {
    sid       = "ListDocumentBucket"
    actions   = ["s3:ListBucket"]
    resources = [module.storage.bucket_arn]
  }

  statement {
    sid = "ManageDocumentObjects"
    actions = [
      "s3:DeleteObject",
      "s3:GetObject",
      "s3:PutObject"
    ]
    resources = ["${module.storage.bucket_arn}/*"]
  }

  statement {
    sid = "WriteContainerLogs"
    actions = [
      "logs:CreateLogStream",
      "logs:DescribeLogStreams",
      "logs:PutLogEvents"
    ]
    resources = [
      "arn:${data.aws_partition.current.partition}:logs:${var.region}:${data.aws_caller_identity.current.account_id}:log-group:/${var.name_prefix}/${var.environment}/api:*",
      "arn:${data.aws_partition.current.partition}:logs:${var.region}:${data.aws_caller_identity.current.account_id}:log-group:/${var.name_prefix}/${var.environment}/worker:*"
    ]
  }

  dynamic "statement" {
    for_each = var.enable_koisa ? [1] : []
    content {
      sid       = "InvokeApprovedBedrockModels"
      actions   = ["bedrock:InvokeModel"]
      resources = sort(tolist(var.bedrock_invoke_resource_arns))
    }
  }

  dynamic "statement" {
    for_each = var.use_redis_tls ? [1] : []
    content {
      sid     = "ConnectToSelectedRedisIamUser"
      actions = ["elasticache:Connect"]
      resources = [
        module.redis.tls_replication_group_arn,
        module.redis.tls_user_arn
      ]
    }
  }
}

resource "aws_iam_role_policy" "app_runtime" {
  count  = var.enable_ec2_alb ? 1 : 0
  name   = "${var.name_prefix}-${var.environment}-app-runtime"
  role   = module.security.app_role_name
  policy = data.aws_iam_policy_document.app_runtime[0].json
}

module "compute" {
  source                    = "./modules/compute"
  name_prefix               = var.name_prefix
  environment               = var.environment
  enable_ec2_alb            = var.enable_ec2_alb
  vpc_id                    = module.network.vpc_id
  public_subnet_ids         = module.network.public_subnet_ids
  private_subnet_ids        = module.network.private_subnet_ids
  alb_sg_id                 = module.security.alb_sg_id
  app_sg_id                 = module.security.app_sg_id
  instance_profile_name     = module.security.app_instance_profile_name
  instance_type             = var.ec2_instance_type
  kms_key_arn               = module.security.kms_app_key_arn
  region                    = var.region
  backend_image_uri         = var.backend_image_uri
  ecr_registry_host         = try(split("/", var.backend_image_uri)[0], "")
  ecr_repository_url        = var.enable_container_registry ? module.registry.repository_url : ""
  rds_master_secret_arn     = module.database.master_user_secret_arn
  jwt_secret_arn            = module.secrets.secret_arns["jwt-secret"]
  encryption_key_secret_arn = module.secrets.secret_arns["encryption-key"]
  db_name                   = var.db_name
  log_retention_days        = var.log_retention_days
  enable_https              = var.enable_https
  certificate_arn           = var.alb_certificate_arn
  api_domain_name           = var.api_domain_name
  route53_zone_id           = var.route53_zone_id

  runtime_env = {
    NODE_ENV           = "production"
    PORT               = "3000"
    LOG_LEVEL          = "info"
    AWS_REGION         = var.region
    DB_SSL             = "true"
    DB_POOL_MIN        = "2"
    DB_POOL_MAX        = "10"
    REDIS_HOST         = coalesce(module.redis.selected_endpoint, "127.0.0.1")
    REDIS_PORT         = tostring(coalesce(module.redis.selected_port, 6379))
    REDIS_TLS          = tostring(var.use_redis_tls)
    REDIS_AUTH_MODE    = var.use_redis_tls ? "iam" : "none"
    REDIS_USERNAME     = var.use_redis_tls ? coalesce(module.redis.tls_user_name, "") : ""
    REDIS_IAM_RESOURCE = var.use_redis_tls ? coalesce(module.redis.tls_replication_group_id, "") : ""
    S3_BUCKET          = module.storage.bucket_name
    # Legacy document-CDN compatibility only. Do not point this at frontend delivery.
    CLOUDFRONT_DOMAIN             = var.enable_cloudfront ? module.storage.cloudfront_domain_name : ""
    KMS_KEY_ID                    = module.security.kms_app_key_arn
    KMS_MEDICAL_KEY_ID            = module.security.kms_medical_key_arn
    SECRETS_PREFIX                = "/${var.name_prefix}/${var.environment}"
    CORS_ORIGIN                   = var.cors_origin
    ENABLE_MEDICAL_MODULE         = "true"
    ENABLE_CLAIMS_MODULE          = "true"
    ENABLE_INTEGRATION_SIMULATION = "false"
    KOISA_ENABLED                 = tostring(var.enable_koisa)
    BEDROCK_REGION                = var.bedrock_region
    BEDROCK_MODEL_ID              = var.bedrock_model_id
    KOISA_MAX_ROUNDS              = tostring(var.koisa_max_rounds)
    KOISA_MAX_TOTAL_TOOL_CALLS    = tostring(var.koisa_max_total_tool_calls)
    KOISA_MAX_PER_TOOL_CALLS      = tostring(var.koisa_max_per_tool_calls)
    KOISA_OVERALL_TIMEOUT_MS      = tostring(var.koisa_overall_timeout_ms)
    KOISA_TOOL_TIMEOUT_MS         = tostring(var.koisa_tool_timeout_ms)
    KOISA_MAX_TOKENS              = tostring(var.koisa_max_tokens)
    KOISA_MAX_TOOL_RESULT_BYTES   = tostring(var.koisa_max_tool_result_bytes)
  }

  depends_on = [aws_iam_role_policy.app_runtime]
}

module "api" {
  source              = "./modules/api"
  name_prefix         = var.name_prefix
  environment         = var.environment
  enable_api_lambda   = var.enable_api_lambda
  lambda_role_arn     = module.security.lambda_role_arn
  smile_id_secret_arn = module.secrets.smile_id_secret_arn
  kms_key_arn         = module.security.kms_app_key_arn
  region              = var.region
}

module "reminders" {
  source                      = "./modules/reminders"
  name_prefix                 = var.name_prefix
  environment                 = var.environment
  region                      = var.region
  enabled                     = var.enable_scheduler
  vpc_id                      = module.network.vpc_id
  private_subnet_ids          = module.network.private_subnet_ids
  db_security_group_id        = module.security.db_sg_id
  redis_security_group_id     = module.security.redis_sg_id
  db_port                     = coalesce(module.database.port, 5432)
  redis_port                  = coalesce(module.redis.selected_port, 6379)
  db_name                     = var.db_name
  db_secret_arn               = var.enable_scheduler ? coalesce(module.database.master_user_secret_arn, "disabled") : "disabled"
  redis_host                  = var.enable_scheduler ? coalesce(module.redis.selected_endpoint, "disabled") : "disabled"
  redis_tls                   = var.use_redis_tls
  redis_auth_mode             = var.use_redis_tls ? "iam" : "none"
  redis_username              = var.use_redis_tls ? coalesce(module.redis.tls_user_name, "disabled") : ""
  redis_iam_resource          = var.use_redis_tls ? coalesce(module.redis.tls_replication_group_id, "disabled") : ""
  redis_replication_group_arn = var.enable_scheduler && var.use_redis_tls ? coalesce(module.redis.tls_replication_group_arn, "disabled") : "disabled"
  redis_user_arn              = var.enable_scheduler && var.use_redis_tls ? coalesce(module.redis.tls_user_arn, "disabled") : "disabled"
  kms_key_arn                 = module.security.kms_app_key_arn
  artifact_path               = var.enable_scheduler ? abspath(var.reminder_lambda_artifact_path) : ""
  log_retention_days          = var.log_retention_days
}

module "automation" {
  source                = "./modules/automation"
  name_prefix           = var.name_prefix
  environment           = var.environment
  enable_scheduler      = var.enable_scheduler
  retain_reminder_dlq   = var.retain_reminder_dlq
  reminder_target_arn   = var.enable_scheduler ? coalesce(module.reminders.function_arn, "disabled") : "disabled"
  kms_key_arn           = module.security.kms_app_key_arn
  enable_step_functions = var.enable_step_functions
}
