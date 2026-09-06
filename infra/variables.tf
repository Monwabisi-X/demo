# ──────────────────────────────────────────────────────────────────────────────
# Root variables. Cost-sensitive toggles default to the CHEAPEST safe posture so a
# `plan` never proposes an expensive footprint by accident. Turn features on
# explicitly per environment.
# ──────────────────────────────────────────────────────────────────────────────

variable "region" {
  description = "AWS region. Default af-south-1 (Cape Town) for POPIA data residency."
  type        = string
  default     = "af-south-1"
}

variable "environment" {
  description = "Environment name (e.g. dev, staging, production)."
  type        = string
  default     = "dev"
}

variable "name_prefix" {
  description = "Prefix applied to resource names."
  type        = string
  default     = "rsf"
}

# ── Networking ──────────────────────────────────────────────────────────────────
variable "vpc_cidr" {
  description = "CIDR block for the VPC."
  type        = string
  default     = "10.20.0.0/16"
}

variable "az_count" {
  description = "Number of availability zones to spread subnets across."
  type        = number
  default     = 2
}

# ── COST TOGGLES (billable resources; all default OFF or cheapest) ────────────────
variable "enable_nat_gateway" {
  description = "Create a NAT Gateway for private-subnet egress. OFF by default (recurring cost). When off, use VPC endpoints for AWS-service egress."
  type        = bool
  default     = false
}

variable "enable_vpc_endpoints" {
  description = "Create the free S3 gateway endpoint and any explicitly selected interface endpoints. Interface endpoints have hourly/per-AZ cost."
  type        = bool
  default     = true
}

variable "interface_endpoint_services" {
  description = "AWS interface endpoint service suffixes required by private workloads. Empty by default because each endpoint has hourly/per-AZ cost."
  type        = set(string)
  default     = []

  validation {
    condition = alltrue([
      for service in var.interface_endpoint_services : contains([
        "bedrock-runtime",
        "ec2messages",
        "ecr.api",
        "ecr.dkr",
        "kms",
        "logs",
        "secretsmanager",
        "ssm",
        "ssmmessages"
      ], service)
    ])
    error_message = "interface_endpoint_services contains an unsupported service suffix."
  }
}

variable "enable_koisa" {
  description = "Enable the guarded Amazon Bedrock Koisa runtime. OFF by default."
  type        = bool
  default     = false
}

variable "bedrock_region" {
  description = "Explicit Bedrock Runtime region. Must equal region when Koisa is enabled for POPIA residency."
  type        = string
  default     = ""

  validation {
    condition     = var.bedrock_region == "" || can(regex("^[a-z]{2}(-[a-z]+)+-[0-9]+$", var.bedrock_region))
    error_message = "bedrock_region must be empty or a valid explicit AWS region name."
  }
}

variable "bedrock_model_id" {
  description = "Explicit Bedrock Converse model or inference-profile ID/ARN. No default model is assumed."
  type        = string
  default     = ""

  validation {
    condition = (
      var.bedrock_model_id == "" ||
      (length(var.bedrock_model_id) <= 2048 && can(regex("^[A-Za-z0-9._:/-]+$", var.bedrock_model_id)))
    )
    error_message = "bedrock_model_id must be empty or contain only Bedrock model-ID/ARN characters."
  }
}

variable "bedrock_invoke_resource_arns" {
  description = "Exact Bedrock model/inference-profile resource ARNs the runtime may invoke. Wildcards are forbidden."
  type        = set(string)
  default     = []

  validation {
    condition = alltrue([
      for arn in var.bedrock_invoke_resource_arns :
      !strcontains(arn, "*") &&
      !strcontains(arn, "?") &&
      can(regex(
        "^arn:[^:]+:bedrock:[a-z0-9-]+:(:foundation-model/[A-Za-z0-9._:/-]+|[0-9]{12}:(custom-model|imported-model|provisioned-model|custom-model-deployment|inference-profile|application-inference-profile)/[A-Za-z0-9._:/-]+)$",
        arn
      ))
    ])
    error_message = "bedrock_invoke_resource_arns must contain only exact invokable model or inference-profile ARNs without wildcards."
  }
}

variable "koisa_max_rounds" {
  type    = number
  default = 4
  validation {
    condition     = var.koisa_max_rounds >= 1 && var.koisa_max_rounds <= 8 && floor(var.koisa_max_rounds) == var.koisa_max_rounds
    error_message = "koisa_max_rounds must be an integer from 1 to 8."
  }
}

variable "koisa_max_total_tool_calls" {
  type    = number
  default = 6
  validation {
    condition     = var.koisa_max_total_tool_calls >= 1 && var.koisa_max_total_tool_calls <= 16 && floor(var.koisa_max_total_tool_calls) == var.koisa_max_total_tool_calls
    error_message = "koisa_max_total_tool_calls must be an integer from 1 to 16."
  }
}

variable "koisa_max_per_tool_calls" {
  type    = number
  default = 2
  validation {
    condition     = var.koisa_max_per_tool_calls >= 1 && var.koisa_max_per_tool_calls <= 5 && floor(var.koisa_max_per_tool_calls) == var.koisa_max_per_tool_calls
    error_message = "koisa_max_per_tool_calls must be an integer from 1 to 5."
  }
}

variable "koisa_overall_timeout_ms" {
  type    = number
  default = 15000
  validation {
    condition     = var.koisa_overall_timeout_ms >= 1000 && var.koisa_overall_timeout_ms <= 30000 && floor(var.koisa_overall_timeout_ms) == var.koisa_overall_timeout_ms
    error_message = "koisa_overall_timeout_ms must be an integer from 1000 to 30000."
  }
}

variable "koisa_tool_timeout_ms" {
  type    = number
  default = 4000
  validation {
    condition     = var.koisa_tool_timeout_ms >= 250 && var.koisa_tool_timeout_ms <= 10000 && floor(var.koisa_tool_timeout_ms) == var.koisa_tool_timeout_ms
    error_message = "koisa_tool_timeout_ms must be an integer from 250 to 10000."
  }
}

variable "koisa_max_tokens" {
  type    = number
  default = 512
  validation {
    condition     = var.koisa_max_tokens >= 64 && var.koisa_max_tokens <= 2048 && floor(var.koisa_max_tokens) == var.koisa_max_tokens
    error_message = "koisa_max_tokens must be an integer from 64 to 2048."
  }
}

variable "koisa_max_tool_result_bytes" {
  type    = number
  default = 8192
  validation {
    condition     = var.koisa_max_tool_result_bytes >= 512 && var.koisa_max_tool_result_bytes <= 32768 && floor(var.koisa_max_tool_result_bytes) == var.koisa_max_tool_result_bytes
    error_message = "koisa_max_tool_result_bytes must be an integer from 512 to 32768."
  }
}

variable "enable_cloudfront" {
  description = "Retain the legacy document-bucket CloudFront/OAC path. Keep enabled through stage one; this does not control frontend delivery."
  type        = bool
  default     = true
}

variable "enable_frontend_delivery" {
  description = "Create the separate private SSE-S3 frontend bucket, OAC, and SPA CloudFront distribution. OFF by default."
  type        = bool
  default     = false
}

variable "enable_rds" {
  description = "Create the RDS PostgreSQL instance (billable). OFF by default."
  type        = bool
  default     = false
}

variable "enable_ec2_alb" {
  description = "Create the deployable EC2 API/worker runtime and Application Load Balancer. OFF by default."
  type        = bool
  default     = false
}

variable "enable_container_registry" {
  description = "Create the encrypted ECR repository for immutable backend images."
  type        = bool
  default     = false
}

variable "backend_image_uri" {
  description = "ECR backend image URI pinned by digest (repository@sha256:...). Required when EC2 is enabled."
  type        = string
  default     = ""

  validation {
    condition = (
      var.backend_image_uri == "" ||
      can(regex("^[^[:space:]]+\\.dkr\\.ecr\\.[^[:space:]]+/[^[:space:]@]+@sha256:[0-9a-f]{64}$", var.backend_image_uri))
    )
    error_message = "backend_image_uri must be empty or an ECR image URI pinned to a lowercase sha256 digest."
  }
}

variable "enable_api_lambda" {
  description = "Create the API Gateway + Lambda (Smile ID) integration. Lambda/API GW are on-demand and cheap."
  type        = bool
  default     = true
}

variable "enable_redis" {
  description = "Create the legacy ElastiCache Redis cluster (billable). Keep enabled throughout the parallel TLS rollout; disabling it is a separately reviewed destructive cleanup."
  type        = bool
  default     = false
}

variable "enable_redis_tls" {
  description = "Create the parallel TLS/IAM Redis 7.1 replication group while retaining the legacy cluster."
  type        = bool
  default     = false
}

variable "use_redis_tls" {
  description = "Select the TLS/IAM replication group for compute and reminder runtime environment wiring. Requires enable_redis_tls=true and IAM-aware application support."
  type        = bool
  default     = false
}

variable "redis_tls_num_cache_clusters" {
  description = "Number of nodes in the TLS replication group. One is non-HA; two or more enables Multi-AZ automatic failover."
  type        = number
  default     = 2

  validation {
    condition     = floor(var.redis_tls_num_cache_clusters) == var.redis_tls_num_cache_clusters && var.redis_tls_num_cache_clusters >= 1 && var.redis_tls_num_cache_clusters <= 6
    error_message = "redis_tls_num_cache_clusters must be an integer from 1 to 6. Use at least 2 for production HA."
  }
}

variable "redis_tls_snapshot_retention_days" {
  description = "Daily snapshot retention for the TLS replication group."
  type        = number
  default     = 7

  validation {
    condition     = floor(var.redis_tls_snapshot_retention_days) == var.redis_tls_snapshot_retention_days && var.redis_tls_snapshot_retention_days >= 1 && var.redis_tls_snapshot_retention_days <= 35
    error_message = "redis_tls_snapshot_retention_days must be an integer from 1 to 35."
  }
}

variable "redis_tls_initial_snapshot_name" {
  description = "Optional exact same-region manual ElastiCache snapshot name used only when initially creating the TLS replication group. ARNs are not accepted by the provider snapshot_name argument."
  type        = string
  default     = ""

  validation {
    condition = var.redis_tls_initial_snapshot_name == "" || (
      length(var.redis_tls_initial_snapshot_name) <= 255 &&
      can(regex("^[A-Za-z]([A-Za-z0-9-]*[A-Za-z0-9])?$", var.redis_tls_initial_snapshot_name)) &&
      !strcontains(var.redis_tls_initial_snapshot_name, "--")
    )
    error_message = "redis_tls_initial_snapshot_name must be an exact snapshot name (not an ARN): 1-255 alphanumeric/hyphen characters, beginning with a letter, with no trailing or consecutive hyphen."
  }
}

variable "enable_scheduler" {
  description = "Create the dedicated reminder Lambda, Redis/RDS access, DLQ, and EventBridge Scheduler tick. OFF by default."
  type        = bool
  default     = false
}

variable "retain_reminder_dlq" {
  description = "Retain an existing encrypted reminder DLQ while Scheduler is disabled so failure evidence can be inspected. Set true in the same change that disables Scheduler. Queue deletion also requires a separate code review to remove prevent_destroy."
  type        = bool
  default     = false
}

variable "reminder_lambda_artifact_path" {
  description = "Local ZIP built by backend/scripts/build-reminder-lambda.sh. Read only when enable_scheduler=true."
  type        = string
  default     = "../backend/dist/reminder-lambda.zip"

  validation {
    condition     = trimspace(var.reminder_lambda_artifact_path) != ""
    error_message = "reminder_lambda_artifact_path cannot be empty."
  }
}

variable "enable_step_functions" {
  description = "Create the Step Functions state machine for the claims lifecycle (billable per transition; cheap)."
  type        = bool
  default     = false
}

# ── Sizing (cheapest sensible defaults; all Graviton/arm64 t4g) ───────────────────
variable "db_instance_class" {
  description = "RDS instance class."
  type        = string
  default     = "db.t4g.micro"
}

variable "db_allocated_storage" {
  description = "RDS allocated storage in GB."
  type        = number
  default     = 20
}

variable "db_multi_az" {
  description = "RDS Multi-AZ (doubles DB cost). OFF by default."
  type        = bool
  default     = false
}

variable "ec2_instance_type" {
  description = "EC2 instance type for the API host."
  type        = string
  default     = "t4g.micro"
}

variable "redis_node_type" {
  description = "ElastiCache node type."
  type        = string
  default     = "cache.t4g.micro"
}

# ── App / DB config ───────────────────────────────────────────────────────────────
variable "db_name" {
  description = "PostgreSQL database name."
  type        = string
  default     = "royalsquare"
}

variable "db_username" {
  description = "PostgreSQL master username. The PASSWORD is never set here — it lives in Secrets Manager (see secrets module) and is injected out-of-band."
  type        = string
  default     = "royalsquare"
}

# ── CORS / frontend ───────────────────────────────────────────────────────────────
variable "app_domain" {
  description = "Optional custom domain for the frontend/API (informational; wiring ACM/Route53 is left to the operator)."
  type        = string
  default     = ""
}


variable "enable_https" {
  description = "Terminate HTTPS at the ALB and redirect HTTP. Required for production compute."
  type        = bool
  default     = false
}

variable "alb_certificate_arn" {
  description = "ACM certificate ARN in the deployment region for the API ALB."
  type        = string
  default     = ""

  validation {
    condition = (
      var.alb_certificate_arn == "" ||
      can(regex("^arn:[^:]+:acm:[a-z0-9-]+:[0-9]{12}:certificate/[0-9a-f-]+$", var.alb_certificate_arn))
    )
    error_message = "alb_certificate_arn must be empty or a valid ACM certificate ARN."
  }
}

variable "api_domain_name" {
  description = "Optional API hostname mapped to the ALB."
  type        = string
  default     = ""

  validation {
    condition = (
      var.api_domain_name == "" ||
      can(regex("^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$", var.api_domain_name))
    )
    error_message = "api_domain_name must be empty or a DNS hostname without a scheme or path."
  }
}

variable "route53_zone_id" {
  description = "Route 53 hosted zone ID for api_domain_name."
  type        = string
  default     = ""
}

variable "cors_origin" {
  description = "Comma-separated browser origins allowed to call the deployed API."
  type        = string
  default     = "http://localhost:8080"

  validation {
    condition     = !can(regex("[\\r\\n\\u0000]", var.cors_origin))
    error_message = "cors_origin cannot contain line breaks or null characters."
  }
}

variable "log_retention_days" {
  description = "CloudWatch log retention for API and worker containers."
  type        = number
  default     = 30

  validation {
    condition = contains([
      1, 3, 5, 7, 14, 30, 60, 90, 120, 150, 180, 365, 400, 545, 731,
      1096, 1827, 2192, 2557, 2922, 3288, 3653
    ], var.log_retention_days)
    error_message = "log_retention_days must be a retention value supported by CloudWatch Logs."
  }
}
