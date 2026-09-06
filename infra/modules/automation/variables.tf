variable "name_prefix" { type = string }
variable "environment" { type = string }
variable "enable_scheduler" { type = bool }
variable "enable_step_functions" { type = bool }
variable "reminder_target_arn" {
  description = "ARN the scheduler invokes to tick the reminder engine (e.g. a Lambda). Optional."
  type        = string
  default     = ""
}
