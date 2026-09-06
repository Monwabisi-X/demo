output "secret_arns" {
  description = "Map of secret name -> ARN."
  value       = { for k, s in aws_secretsmanager_secret.this : k => s.arn }
}
output "db_password_secret_arn" {
  value = aws_secretsmanager_secret.this["db-password"].arn
}
output "smile_id_secret_arn" {
  value = aws_secretsmanager_secret.this["smile-id-api-key"].arn
}
