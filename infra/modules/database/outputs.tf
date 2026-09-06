output "endpoint" {
  value = var.enable_rds ? aws_db_instance.this[0].address : null
}
output "port" {
  value = var.enable_rds ? aws_db_instance.this[0].port : null
}
output "identifier" {
  value = var.enable_rds ? aws_db_instance.this[0].identifier : null
}
