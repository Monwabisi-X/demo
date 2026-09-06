# RDS PostgreSQL 16 in PRIVATE subnets, KMS-encrypted, NOT publicly accessible. The master
# RDS manages the master password and stores it in Secrets Manager encrypted by the
# application KMS key. Terraform receives only the secret ARN, never the password value.

resource "aws_db_subnet_group" "this" {
  count      = var.enable_rds ? 1 : 0
  name       = "${var.name_prefix}-${var.environment}-db-subnets"
  subnet_ids = var.private_subnet_ids
  tags       = { Name = "${var.name_prefix}-${var.environment}-db-subnets" }
}

resource "aws_db_instance" "this" {
  count      = var.enable_rds ? 1 : 0
  identifier = "${var.name_prefix}-${var.environment}-pg"

  engine         = "postgres"
  engine_version = "16"
  instance_class = var.instance_class

  allocated_storage     = var.allocated_storage
  max_allocated_storage = var.allocated_storage * 2
  storage_type          = "gp3"
  storage_encrypted     = true
  kms_key_id            = var.kms_key_arn

  db_name  = var.db_name
  username = var.db_username

  manage_master_user_password   = true
  master_user_secret_kms_key_id = var.kms_key_arn

  multi_az               = var.multi_az
  publicly_accessible    = false
  db_subnet_group_name   = aws_db_subnet_group.this[0].name
  vpc_security_group_ids = [var.db_sg_id]

  backup_retention_period = 7
  deletion_protection     = var.environment == "production"
  skip_final_snapshot     = var.environment != "production"
  apply_immediately       = false

  # Keep the plaintext password out of any TF human-readable output; Sensitive by type.
  tags = { Name = "${var.name_prefix}-${var.environment}-pg" }
}
