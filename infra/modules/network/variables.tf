variable "name_prefix" { type = string }
variable "environment" { type = string }
variable "vpc_cidr" { type = string }
variable "az_count" { type = number }
variable "enable_nat_gateway" { type = bool }
variable "enable_vpc_endpoints" { type = bool }
variable "region" { type = string }
