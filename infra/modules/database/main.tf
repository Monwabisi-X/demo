# RDS PostgreSQL 16 in PRIVATE subnets, KMS-encrypted, NOT publicly accessible. The master
# password is NOT stored in Terraform — it is read from a Secrets Manager secret that is
# populated out-of-band (CI/GitHub Secrets or manually). We pull the current value via a data
# source only at apply time; it never appears in the repo.

data "aws_secretsmanager_secret_version" "db_password" {
  count     = var.enable_rds ? 1 : 0
  secret_id = var.password_secret_arn
}

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
  password = data.aws_secretsmanager_secret_version.db_password[0].secret_string

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
