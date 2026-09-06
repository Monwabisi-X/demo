output "vpc_id" {
  description = "VPC id."
  value       = module.network.vpc_id
}

output "documents_bucket" {
  description = "Private S3 bucket for client documents."
  value       = module.storage.bucket_name
}

output "cloudfront_domain" {
  description = "CloudFront domain serving the private bucket (null if disabled)."
  value       = module.storage.cloudfront_domain_name
}

output "rds_endpoint" {
  description = "RDS endpoint (null if enable_rds = false)."
  value       = module.database.endpoint
}

output "redis_endpoint" {
  description = "ElastiCache Redis endpoint (null if enable_redis = false)."
  value       = module.redis.endpoint
}

output "alb_dns_name" {
  description = "ALB DNS name (null if enable_ec2_alb = false)."
  value       = module.compute.alb_dns_name
}

output "api_endpoint" {
  description = "API Gateway endpoint for the Smile ID integration (null if disabled)."
  value       = module.api.api_endpoint
}

output "kms_app_key_arn" {
  description = "KMS key ARN for application data."
  value       = module.security.kms_app_key_arn
}

output "reminder_schedule_name" {
  description = "EventBridge Scheduler reminder schedule name (null when disabled)."
  value       = module.automation.reminder_schedule_name
}

output "claims_state_machine_arn" {
  description = "Claims lifecycle state machine ARN (null when disabled)."
  value       = module.automation.claims_state_machine_arn
}

output "secret_arns" {
  description = "Map of Secrets Manager secret name -> ARN (values injected out-of-band)."
  value       = module.secrets.secret_arns
}
