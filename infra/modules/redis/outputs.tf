output "endpoint" {
  value = var.enable_redis ? aws_elasticache_cluster.this[0].cache_nodes[0].address : null
}
output "port" {
  value = var.enable_redis ? 6379 : null
}
