# Automation for the "straight-through" features:
#   - EventBridge Scheduler: ticks the reminder engine through a dedicated Lambda adapter.
#   - Step Functions: orchestrates the multi-week motor-claim lifecycle.
# Both are cheap/pay-per-use but toggled so a plan stays minimal.

# ── IAM role assumed by EventBridge Scheduler ─────────────────────────────────────
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

# Daily reminder tick. It is created only when a dedicated reminder Lambda target is
# explicitly supplied. The execution role is credentials for Scheduler, never the target.
data "aws_iam_policy_document" "scheduler_invoke" {
  count = var.enable_scheduler && var.reminder_target_arn != "" ? 1 : 0

  statement {
    actions   = ["lambda:InvokeFunction"]
    resources = [var.reminder_target_arn]
  }
}

resource "aws_iam_role_policy" "scheduler_invoke" {
  count  = var.enable_scheduler && var.reminder_target_arn != "" ? 1 : 0
  name   = "${var.name_prefix}-${var.environment}-invoke-reminder"
  role   = aws_iam_role.scheduler[0].id
  policy = data.aws_iam_policy_document.scheduler_invoke[0].json
}

resource "aws_scheduler_schedule" "reminders" {
  count                        = var.enable_scheduler ? 1 : 0
  name                         = "${var.name_prefix}-${var.environment}-reminders-tick"
  schedule_expression          = "rate(1 day)"
  schedule_expression_timezone = "Africa/Johannesburg"
  state                        = "ENABLED"

  flexible_time_window {
    mode = "OFF"
  }

  target {
    arn      = var.reminder_target_arn
    role_arn = aws_iam_role.scheduler[0].arn
  }

  lifecycle {
    precondition {
      condition     = var.reminder_target_arn != ""
      error_message = "enable_scheduler=true requires reminder_target_arn to be a dedicated reminder Lambda function ARN."
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
  # A minimal placeholder definition mirroring the app's MOTOR_LIFECYCLE steps. Replace the
  # Pass states with Task states (Lambda/SDK integrations) when wiring real provider calls.
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
