# ──────────────────────────────────────────────────────────────────────────────
# Root composition. Wires the modules together. Billable resources are gated behind
# the enable_* toggles in variables.tf and default to the cheapest safe posture.
#
# Plan-only: run `terraform init -backend=false && terraform validate && terraform plan`.
# There is NO apply in this repository.
# ──────────────────────────────────────────────────────────────────────────────

module "network" {
  source               = "./modules/network"
  name_prefix          = var.name_prefix
  environment          = var.environment
  vpc_cidr             = var.vpc_cidr
  az_count             = var.az_count
  enable_nat_gateway   = var.enable_nat_gateway
  enable_vpc_endpoints = var.enable_vpc_endpoints
  region               = var.region
}

module "security" {
  source      = "./modules/security"
  name_prefix = var.name_prefix
  environment = var.environment
  vpc_id      = module.network.vpc_id
  vpc_cidr    = var.vpc_cidr
}

module "secrets" {
  source      = "./modules/secrets"
  name_prefix = var.name_prefix
  environment = var.environment
  kms_key_arn = module.security.kms_app_key_arn
}

module "storage" {
  source            = "./modules/storage"
  name_prefix       = var.name_prefix
  environment       = var.environment
  kms_key_arn       = module.security.kms_app_key_arn
  enable_cloudfront = var.enable_cloudfront
}

module "database" {
  source              = "./modules/database"
  name_prefix         = var.name_prefix
  environment         = var.environment
  enable_rds          = var.enable_rds
  private_subnet_ids  = module.network.private_subnet_ids
  db_sg_id            = module.security.db_sg_id
  kms_key_arn         = module.security.kms_app_key_arn
  instance_class      = var.db_instance_class
  allocated_storage   = var.db_allocated_storage
  multi_az            = var.db_multi_az
  db_name             = var.db_name
  db_username         = var.db_username
  password_secret_arn = module.secrets.db_password_secret_arn
}

module "redis" {
  source             = "./modules/redis"
  name_prefix        = var.name_prefix
  environment        = var.environment
  enable_redis       = var.enable_redis
  private_subnet_ids = module.network.private_subnet_ids
  redis_sg_id        = module.security.redis_sg_id
  node_type          = var.redis_node_type
}

module "compute" {
  source                = "./modules/compute"
  name_prefix           = var.name_prefix
  environment           = var.environment
  enable_ec2_alb        = var.enable_ec2_alb
  vpc_id                = module.network.vpc_id
  public_subnet_ids     = module.network.public_subnet_ids
  private_subnet_ids    = module.network.private_subnet_ids
  alb_sg_id             = module.security.alb_sg_id
  app_sg_id             = module.security.app_sg_id
  instance_profile_name = module.security.app_instance_profile_name
  instance_type         = var.ec2_instance_type
}

module "api" {
  source              = "./modules/api"
  name_prefix         = var.name_prefix
  environment         = var.environment
  enable_api_lambda   = var.enable_api_lambda
  lambda_role_arn     = module.security.lambda_role_arn
  smile_id_secret_arn = module.secrets.smile_id_secret_arn
  region              = var.region
}

module "automation" {
  source                = "./modules/automation"
  name_prefix           = var.name_prefix
  environment           = var.environment
  enable_scheduler      = var.enable_scheduler
  enable_step_functions = var.enable_step_functions
}
