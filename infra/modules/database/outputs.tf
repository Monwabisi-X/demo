output "endpoint" {
  value = var.enable_rds ? aws_db_instance.this[0].address : null
}
output "port" {
  value = var.enable_rds ? aws_db_instance.this[0].port : null
}
output "identifier" {
  value = var.enable_rds ? aws_db_instance.this[0].identifier : null
}
output "master_user_secret_arn" {
  description = "RDS-managed master credential secret ARN (null when RDS is disabled)."
  value       = var.enable_rds ? aws_db_instance.this[0].master_user_secret[0].secret_arn : null
}
