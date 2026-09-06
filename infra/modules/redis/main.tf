# The legacy single-node cluster remains at its original address during the parallel TLS/IAM
# rollout. Do not rename it or change its resource kind; retiring it is a later reviewed change.
resource "aws_elasticache_subnet_group" "this" {
  count      = var.enable_redis || var.enable_redis_tls ? 1 : 0
  name       = "${var.name_prefix}-${var.environment}-redis-subnets"
  subnet_ids = var.private_subnet_ids

  lifecycle {
    prevent_destroy = true
  }
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

  lifecycle {
    prevent_destroy = true
  }

  tags = { Name = "${var.name_prefix}-${var.environment}-redis" }
}

# ElastiCache user groups require a default user. This replacement default user cannot execute
# commands and has no password, so the user group exposes only the IAM-authenticated app user.
resource "aws_elasticache_user" "default_disabled" {
  count         = var.enable_redis_tls ? 1 : 0
  user_id       = "${var.name_prefix}-${var.environment}-redis-default"
  user_name     = "default"
  access_string = "off ~* -@all"
  engine        = "REDIS"

  authentication_mode {
    type = "no-password-required"
  }

  tags = { Name = "${var.name_prefix}-${var.environment}-redis-default-disabled" }
}

resource "aws_elasticache_user" "application" {
  count         = var.enable_redis_tls ? 1 : 0
  user_id       = "${var.name_prefix}-${var.environment}-redis-app"
  user_name     = "${var.name_prefix}-${var.environment}-redis-app"
  access_string = "on ~* +@all"
  engine        = "REDIS"

  authentication_mode {
    type = "iam"
  }

  tags = { Name = "${var.name_prefix}-${var.environment}-redis-app" }
}

resource "aws_elasticache_user_group" "iam_auth" {
  count         = var.enable_redis_tls ? 1 : 0
  user_group_id = "${var.name_prefix}-${var.environment}-redis-iam"
  engine        = "REDIS"
  user_ids = [
    aws_elasticache_user.default_disabled[0].user_id,
    aws_elasticache_user.application[0].user_id
  ]

  tags = { Name = "${var.name_prefix}-${var.environment}-redis-iam" }
}

resource "aws_elasticache_replication_group" "tls" {
  count                      = var.enable_redis_tls ? 1 : 0
  replication_group_id       = "${var.name_prefix}-${var.environment}-redis-tls"
  description                = "${var.name_prefix}-${var.environment} TLS/IAM Redis"
  engine                     = "redis"
  engine_version             = "7.1"
  parameter_group_name       = "default.redis7"
  node_type                  = var.node_type
  port                       = 6379
  num_cache_clusters         = var.tls_num_cache_clusters
  automatic_failover_enabled = var.tls_num_cache_clusters > 1
  multi_az_enabled           = var.tls_num_cache_clusters > 1

  transit_encryption_enabled = true
  transit_encryption_mode    = "required"
  at_rest_encryption_enabled = true
  kms_key_id                 = var.kms_key_arn
  user_group_ids             = [aws_elasticache_user_group.iam_auth[0].user_group_id]

  subnet_group_name         = aws_elasticache_subnet_group.this[0].name
  security_group_ids        = [var.redis_sg_id]
  snapshot_retention_limit  = var.tls_snapshot_retention_days
  snapshot_window           = "02:00-03:00"
  maintenance_window        = "sun:03:00-sun:04:00"
  snapshot_name             = var.tls_initial_snapshot_name != "" ? var.tls_initial_snapshot_name : null
  final_snapshot_identifier = "${var.name_prefix}-${var.environment}-redis-tls-final"

  lifecycle {
    prevent_destroy = true
  }

  tags = { Name = "${var.name_prefix}-${var.environment}-redis-tls" }
}
