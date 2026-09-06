variable "name_prefix" { type = string }
variable "environment" { type = string }
variable "enable_redis" { type = bool }
variable "private_subnet_ids" { type = list(string) }
variable "redis_sg_id" { type = string }
variable "node_type" { type = string }
