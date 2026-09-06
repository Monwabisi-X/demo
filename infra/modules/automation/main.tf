# Pay-per-use automation: a dedicated reminder schedule and claims state machine.

data "aws_iam_policy_document" "scheduler_assume" {
  count = var.enable_scheduler ? 1 : 0
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["scheduler.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "scheduler" {
  count              = var.enable_scheduler ? 1 : 0
  name               = "${var.name_prefix}-${var.environment}-scheduler-role"
  assume_role_policy = data.aws_iam_policy_document.scheduler_assume[0].json
}

resource "aws_sqs_queue" "reminder_dlq" {
  count                             = var.enable_scheduler || var.retain_reminder_dlq ? 1 : 0
  name                              = "${var.name_prefix}-${var.environment}-reminders-dlq"
  message_retention_seconds         = 1209600
  kms_master_key_id                 = var.kms_key_arn
  kms_data_key_reuse_period_seconds = 300

  lifecycle {
    prevent_destroy = true
  }
}

data "aws_iam_policy_document" "scheduler_invoke" {
  count = var.enable_scheduler ? 1 : 0

  statement {
    sid       = "InvokeDedicatedReminderLambda"
    actions   = ["lambda:InvokeFunction"]
    resources = [var.reminder_target_arn]
  }

  statement {
    sid       = "SendFailedInvocationsToDlq"
    actions   = ["sqs:SendMessage"]
    resources = [aws_sqs_queue.reminder_dlq[0].arn]
  }

  statement {
    sid = "UseEncryptedDlqKey"
    actions = [
      "kms:Decrypt",
      "kms:GenerateDataKey"
    ]
    resources = [var.kms_key_arn]
  }
}

resource "aws_iam_role_policy" "scheduler_invoke" {
  count  = var.enable_scheduler ? 1 : 0
  name   = "${var.name_prefix}-${var.environment}-invoke-reminder"
  role   = aws_iam_role.scheduler[0].id
  policy = data.aws_iam_policy_document.scheduler_invoke[0].json
}

resource "aws_scheduler_schedule" "reminders" {
  count                        = var.enable_scheduler ? 1 : 0
  name                         = "${var.name_prefix}-${var.environment}-reminders-tick"
  schedule_expression          = "cron(0 8 * * ? *)"
  schedule_expression_timezone = "Africa/Johannesburg"
  state                        = "ENABLED"

  flexible_time_window { mode = "OFF" }

  target {
    arn      = var.reminder_target_arn
    role_arn = aws_iam_role.scheduler[0].arn
    input    = jsonencode({ source = "eventbridge-scheduler", action = "run-reminders" })

    dead_letter_config { arn = aws_sqs_queue.reminder_dlq[0].arn }
    retry_policy {
      maximum_event_age_in_seconds = 3600
      maximum_retry_attempts       = 2
    }
  }

  lifecycle {
    precondition {
      condition     = var.reminder_target_arn != ""
      error_message = "The scheduler requires the repository-managed reminder Lambda ARN."
    }
  }

  depends_on = [aws_iam_role_policy.scheduler_invoke]
}

# ── Step Functions: motor-claim lifecycle orchestration ───────────────────────────
data "aws_iam_policy_document" "sfn_assume" {
  count = var.enable_step_functions ? 1 : 0
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["states.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "sfn" {
  count              = var.enable_step_functions ? 1 : 0
  name               = "${var.name_prefix}-${var.environment}-claims-sfn-role"
  assume_role_policy = data.aws_iam_policy_document.sfn_assume[0].json
}

resource "aws_sfn_state_machine" "claims" {
  count    = var.enable_step_functions ? 1 : 0
  name     = "${var.name_prefix}-${var.environment}-claims-lifecycle"
  role_arn = aws_iam_role.sfn[0].arn
  definition = jsonencode({
    Comment = "Royal Square motor claim lifecycle"
    StartAt = "ClaimNumberIssued"
    States = {
      ClaimNumberIssued = { Type = "Pass", Next = "Assessment" }
      Assessment        = { Type = "Pass", Next = "RepairQuotes" }
      RepairQuotes      = { Type = "Pass", Next = "Authorised" }
      Authorised        = { Type = "Pass", Next = "Repairs" }
      Repairs           = { Type = "Pass", Next = "Closed" }
      Closed            = { Type = "Succeed" }
    }
  })
  tags = { Name = "${var.name_prefix}-${var.environment}-claims-lifecycle" }
}
