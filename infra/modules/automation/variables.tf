variable "name_prefix" { type = string }
variable "environment" { type = string }
variable "enable_scheduler" { type = bool }
variable "retain_reminder_dlq" { type = bool }
variable "enable_step_functions" { type = bool }
variable "kms_key_arn" { type = string }
variable "reminder_target_arn" {
  description = "Repository-managed dedicated reminder Lambda ARN."
  type        = string
  default     = ""
}
