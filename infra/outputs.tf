output "vpc_id" {
  description = "VPC id."
  value       = module.network.vpc_id
}

output "documents_bucket" {
  description = "Private S3 bucket for client documents."
  value       = module.storage.bucket_name
}

output "cloudfront_domain" {
  description = "Legacy document-bucket CloudFront domain (null if enable_cloudfront is false)."
  value       = module.storage.cloudfront_domain_name
}

output "frontend_bucket" {
  description = "Private SSE-S3 bucket for frontend artifacts (null if frontend delivery is disabled)."
  value       = module.frontend_delivery.frontend_bucket_name
}

output "frontend_bucket_arn" {
  description = "Private SSE-S3 frontend bucket ARN (null if frontend delivery is disabled)."
  value       = module.frontend_delivery.frontend_bucket_arn
}

output "frontend_cloudfront_domain" {
  description = "CloudFront domain serving the frontend SPA (null if frontend delivery is disabled)."
  value       = module.frontend_delivery.frontend_cloudfront_domain_name
}

output "frontend_cloudfront_distribution_id" {
  description = "Frontend CloudFront distribution ID used for explicit deploy invalidations (null if disabled)."
  value       = module.frontend_delivery.frontend_cloudfront_distribution_id
}

output "rds_endpoint" {
  description = "RDS endpoint (null if enable_rds = false)."
  value       = module.database.endpoint
}

output "rds_master_secret_arn" {
  description = "RDS-managed master credential secret ARN (null if RDS is disabled)."
  value       = module.database.master_user_secret_arn
}

output "interface_endpoint_ids" {
  description = "Private interface endpoint IDs keyed by AWS service suffix."
  value       = module.network.interface_endpoint_ids
}

output "redis_endpoint" {
  description = "ElastiCache Redis endpoint (null if enable_redis = false)."
  value       = module.redis.endpoint
}

output "redis_tls_endpoint" {
  description = "Parallel TLS/IAM replication-group primary endpoint (null if enable_redis_tls = false)."
  value       = module.redis.tls_endpoint
}

output "redis_tls_port" {
  description = "Parallel TLS/IAM replication-group port (null if enable_redis_tls = false)."
  value       = module.redis.tls_port
}

output "redis_selected_endpoint" {
  description = "Endpoint selected for runtime wiring by use_redis_tls."
  value       = module.redis.selected_endpoint
}

output "redis_selected_port" {
  description = "Port selected for runtime wiring by use_redis_tls."
  value       = module.redis.selected_port
}

output "redis_tls_replication_group_arn" {
  description = "Provider-produced ARN of the parallel TLS/IAM replication group."
  value       = module.redis.tls_replication_group_arn
}

output "redis_tls_replication_group_id" {
  description = "Provider-produced cache ID used as the ElastiCache IAM signing resource."
  value       = module.redis.tls_replication_group_id
}

output "redis_tls_user_arn" {
  description = "Provider-produced ARN of the IAM-authenticated application user."
  value       = module.redis.tls_user_arn
}

output "redis_tls_user_name" {
  description = "User name of the IAM-authenticated application user."
  value       = module.redis.tls_user_name
}

output "ecr_repository_url" {
  description = "Backend ECR repository URL (null when disabled)."
  value       = module.registry.repository_url
}

output "alb_dns_name" {
  description = "ALB DNS name (null if enable_ec2_alb = false)."
  value       = module.compute.alb_dns_name
}

output "backend_api_url" {
  description = "Backend API base URL through the ALB (null if compute is disabled)."
  value       = module.compute.api_url
}

output "backend_log_groups" {
  description = "CloudWatch log group ARNs for the API and worker containers."
  value = {
    api    = module.compute.api_log_group_arn
    worker = module.compute.worker_log_group_arn
  }
}

output "api_endpoint" {
  description = "API Gateway endpoint for the Smile ID integration (null if disabled)."
  value       = module.api.api_endpoint
}

output "kms_app_key_arn" {
  description = "KMS key ARN for application data."
  value       = module.security.kms_app_key_arn
}

output "reminder_lambda_arn" {
  description = "Dedicated reminder Lambda ARN (null when disabled)."
  value       = module.reminders.function_arn
}

output "reminder_lambda_log_group_arn" {
  description = "Dedicated reminder Lambda log group ARN (null when disabled)."
  value       = module.reminders.log_group_arn
}

output "reminder_schedule_name" {
  description = "EventBridge Scheduler reminder schedule name (null when disabled)."
  value       = module.automation.reminder_schedule_name
}

output "reminder_scheduler_dlq" {
  description = "Reminder Scheduler dead-letter queue coordinates (retained when retain_reminder_dlq is true)."
  value = {
    arn = module.automation.reminder_dlq_arn
    url = module.automation.reminder_dlq_url
  }
}

output "claims_state_machine_arn" {
  description = "Claims lifecycle state machine ARN (null when disabled)."
  value       = module.automation.claims_state_machine_arn
}

output "secret_arns" {
  description = "Map of Secrets Manager secret name -> ARN (values injected out-of-band)."
  value       = module.secrets.secret_arns
}
