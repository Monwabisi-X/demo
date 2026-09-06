variable "name_prefix" { type = string }
variable "environment" { type = string }
variable "enable_scheduler" { type = bool }
variable "enable_step_functions" { type = bool }
variable "reminder_target_arn" {
  description = "Dedicated reminder Lambda function ARN invoked by EventBridge Scheduler. Required when enable_scheduler=true."
  type        = string
  default     = ""

  validation {
    condition = (
      var.reminder_target_arn == "" ||
      can(regex("^arn:(aws|aws-us-gov|aws-cn):lambda:[a-z0-9-]+:[0-9]{12}:function:[A-Za-z0-9-_]+(:[A-Za-z0-9-_]+)?$", var.reminder_target_arn))
    )
    error_message = "reminder_target_arn must be empty or a valid Lambda function ARN (optionally with an alias or version)."
  }
}
