output "reminder_schedule_name" {
  value = var.enable_scheduler ? aws_scheduler_schedule.reminders[0].name : null
}

output "reminder_dlq_arn" {
  value = var.enable_scheduler || var.retain_reminder_dlq ? aws_sqs_queue.reminder_dlq[0].arn : null
}

output "reminder_dlq_url" {
  value = var.enable_scheduler || var.retain_reminder_dlq ? aws_sqs_queue.reminder_dlq[0].url : null
}

output "claims_state_machine_arn" {
  value = var.enable_step_functions ? aws_sfn_state_machine.claims[0].arn : null
}
