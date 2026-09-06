variable "name_prefix" { type = string }
variable "environment" { type = string }
variable "enable_ec2_alb" { type = bool }
variable "vpc_id" { type = string }
variable "public_subnet_ids" { type = list(string) }
variable "private_subnet_ids" { type = list(string) }
variable "alb_sg_id" { type = string }
variable "app_sg_id" { type = string }
variable "instance_profile_name" { type = string }
variable "instance_type" { type = string }
variable "kms_key_arn" { type = string }
variable "region" { type = string }
variable "backend_image_uri" {
  description = "Immutable ECR backend image URI pinned by sha256 digest."
  type        = string
  default     = ""
}
variable "ecr_registry_host" { type = string }
variable "ecr_repository_url" {
  description = "Repository URL managed by the registry module; the image digest must belong to it."
  type        = string
  default     = ""
}
variable "rds_master_secret_arn" { type = string }
variable "jwt_secret_arn" { type = string }
variable "encryption_key_secret_arn" { type = string }
variable "db_name" { type = string }
variable "runtime_env" {
  description = "Non-secret backend environment variables rendered into the EC2 host configuration."
  type        = map(string)
  default     = {}

  validation {
    condition = alltrue([
      for key, value in var.runtime_env :
      can(regex("^[A-Z][A-Z0-9_]*$", key)) &&
      !can(regex("[\\r\\n\\u0000]", value))
    ])
    error_message = "runtime_env keys must be uppercase env names and values cannot contain line breaks or null characters."
  }
}
variable "log_retention_days" {
  type    = number
  default = 30
}
variable "enable_https" {
  type    = bool
  default = false
}
variable "certificate_arn" {
  type    = string
  default = ""
}
variable "api_domain_name" {
  type    = string
  default = ""
}
variable "route53_zone_id" {
  type    = string
  default = ""
}
