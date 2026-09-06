variable "name_prefix" { type = string }
variable "environment" { type = string }
variable "enable_rds" { type = bool }
variable "private_subnet_ids" { type = list(string) }
variable "db_sg_id" { type = string }
variable "kms_key_arn" { type = string }
variable "instance_class" { type = string }
variable "allocated_storage" { type = number }
variable "multi_az" { type = bool }
variable "db_name" { type = string }
variable "db_username" { type = string }
variable "password_secret_arn" {
  description = "Secrets Manager ARN holding the DB master password (value injected out-of-band)."
  type        = string
}
