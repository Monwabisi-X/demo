# ElastiCache Redis (single node, cheapest). Toggled OFF by default. The app REQUIRES Redis in
# production for JWT refresh/blacklist, rate limiting, and the Bull job queues (reminders /
# provider dispatch). If cost is a concern early on, run a small self-hosted Redis on the EC2
# host instead (see infra/README.md) and leave enable_redis = false.

resource "aws_elasticache_subnet_group" "this" {
  count      = var.enable_redis ? 1 : 0
  name       = "${var.name_prefix}-${var.environment}-redis-subnets"
  subnet_ids = var.private_subnet_ids
}

resource "aws_elasticache_cluster" "this" {
  count                = var.enable_redis ? 1 : 0
  cluster_id           = "${var.name_prefix}-${var.environment}-redis"
  engine               = "redis"
  node_type            = var.node_type
  num_cache_nodes      = 1
  parameter_group_name = "default.redis7"
  engine_version       = "7.1"
  port                 = 6379
  subnet_group_name    = aws_elasticache_subnet_group.this[0].name
  security_group_ids   = [var.redis_sg_id]
  tags                 = { Name = "${var.name_prefix}-${var.environment}-redis" }
}
