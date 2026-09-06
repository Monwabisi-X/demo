output "function_arn" {
  value = var.enabled ? aws_lambda_function.this[0].arn : null
}

output "function_name" {
  value = var.enabled ? aws_lambda_function.this[0].function_name : null
}

output "log_group_arn" {
  value = var.enabled ? aws_cloudwatch_log_group.this[0].arn : null
}

output "security_group_id" {
  value = var.enabled ? aws_security_group.this[0].id : null
}

output "role_arn" {
  value = var.enabled ? aws_iam_role.this[0].arn : null
}
