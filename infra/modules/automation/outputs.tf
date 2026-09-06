output "reminder_schedule_name" {
  value = var.enable_scheduler ? aws_scheduler_schedule.reminders[0].name : null
}
output "claims_state_machine_arn" {
  value = var.enable_step_functions ? aws_sfn_state_machine.claims[0].arn : null
}
