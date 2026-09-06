# Legacy outputs intentionally retain their original meaning and resource references.
output "endpoint" {
  value = var.enable_redis ? aws_elasticache_cluster.this[0].cache_nodes[0].address : null
}
output "port" {
  value = var.enable_redis ? 6379 : null
}

output "tls_endpoint" {
  value = var.enable_redis_tls ? aws_elasticache_replication_group.tls[0].primary_endpoint_address : null
}

output "tls_port" {
  value = var.enable_redis_tls ? aws_elasticache_replication_group.tls[0].port : null
}

output "selected_endpoint" {
  value = var.use_redis_tls ? (
    var.enable_redis_tls ? aws_elasticache_replication_group.tls[0].primary_endpoint_address : null
    ) : (
    var.enable_redis ? aws_elasticache_cluster.this[0].cache_nodes[0].address : null
  )
}

output "selected_port" {
  value = var.use_redis_tls ? (
    var.enable_redis_tls ? aws_elasticache_replication_group.tls[0].port : null
    ) : (
    var.enable_redis ? 6379 : null
  )
}

output "tls_replication_group_arn" {
  value = var.enable_redis_tls ? aws_elasticache_replication_group.tls[0].arn : null
}

output "tls_replication_group_id" {
  value = var.enable_redis_tls ? aws_elasticache_replication_group.tls[0].replication_group_id : null
}

output "tls_user_arn" {
  value = var.enable_redis_tls ? aws_elasticache_user.application[0].arn : null
}

output "tls_user_name" {
  value = var.enable_redis_tls ? aws_elasticache_user.application[0].user_name : null
}
