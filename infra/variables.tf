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
  description = "Create S3 gateway + interface VPC endpoints so private subnets reach AWS services without a NAT Gateway."
  type        = bool
  default     = true
}

variable "enable_cloudfront" {
  description = "Create the CloudFront distribution in front of the private S3 bucket (OAC)."
  type        = bool
  default     = true
}

variable "enable_rds" {
  description = "Create the RDS PostgreSQL instance (billable). OFF by default."
  type        = bool
  default     = false
}

variable "enable_ec2_alb" {
  description = "Create the EC2 instance + Application Load Balancer (billable). OFF by default."
  type        = bool
  default     = false
}

variable "enable_api_lambda" {
  description = "Create the API Gateway + Lambda (Smile ID) integration. Lambda/API GW are on-demand and cheap."
  type        = bool
  default     = true
}

variable "enable_redis" {
  description = "Create ElastiCache Redis (billable). OFF by default — see README for the low-cost self-hosted alternative on EC2."
  type        = bool
  default     = false
}

variable "enable_scheduler" {
  description = "Create the EventBridge Scheduler reminder tick. Requires reminder_target_arn. OFF until a dedicated reminder Lambda is deployed."
  type        = bool
  default     = false
}

variable "reminder_target_arn" {
  description = "Dedicated reminder Lambda function ARN invoked by EventBridge Scheduler. Required when enable_scheduler=true."
  type        = string
  default     = ""

  validation {
    condition = (
      var.reminder_target_arn == "" ||
      can(regex("^arn:(aws|aws-us-gov|aws-cn):lambda:[a-z0-9-]+:[0-9]{12}:function:[A-Za-z0-9-_]+(:[A-Za-z0-9-_]+)?$", var.reminder_target_arn))
    )
    error_message = "reminder_target_arn must be empty or a valid Lambda function ARN (optionally with an alias or version)."
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
