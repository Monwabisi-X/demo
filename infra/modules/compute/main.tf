# EC2 (in private subnets) fronted by an ALB (in public subnets). Toggled OFF by default.
# The instance runs the containerised backend; access is via SSM (no SSH/bastion). The ALB
# terminates HTTP(S) and forwards to the app on port 3000.

data "aws_ami" "al2023_arm" {
  count       = var.enable_ec2_alb ? 1 : 0
  most_recent = true
  owners      = ["amazon"]
  filter {
    name   = "name"
    values = ["al2023-ami-*-arm64"]
  }
  filter {
    name   = "architecture"
    values = ["arm64"]
  }
}

resource "aws_lb" "this" {
  count              = var.enable_ec2_alb ? 1 : 0
  name               = "${var.name_prefix}-${var.environment}-alb"
  load_balancer_type = "application"
  internal           = false
  security_groups    = [var.alb_sg_id]
  subnets            = var.public_subnet_ids
  tags               = { Name = "${var.name_prefix}-${var.environment}-alb" }
}

resource "aws_lb_target_group" "app" {
  count       = var.enable_ec2_alb ? 1 : 0
  name        = "${var.name_prefix}-${var.environment}-tg"
  port        = 3000
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "instance"

  health_check {
    path                = "/health"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
    matcher             = "200"
  }
}

# HTTP listener. In production, add an HTTPS (443) listener with an ACM cert and redirect 80→443.
resource "aws_lb_listener" "http" {
  count             = var.enable_ec2_alb ? 1 : 0
  load_balancer_arn = aws_lb.this[0].arn
  port              = 80
  protocol          = "HTTP"
  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app[0].arn
  }
}

resource "aws_launch_template" "app" {
  count         = var.enable_ec2_alb ? 1 : 0
  name_prefix   = "${var.name_prefix}-${var.environment}-app-"
  image_id      = data.aws_ami.al2023_arm[0].id
  instance_type = var.instance_type

  iam_instance_profile {
    name = var.instance_profile_name
  }
  vpc_security_group_ids = [var.app_sg_id]

  metadata_options {
    http_tokens   = "required" # IMDSv2 only
    http_endpoint = "enabled"
  }

  tag_specifications {
    resource_type = "instance"
    tags          = { Name = "${var.name_prefix}-${var.environment}-app" }
  }
}

# Single-instance ASG keeps cost minimal while still giving rolling replacement + ALB health.
resource "aws_autoscaling_group" "app" {
  count               = var.enable_ec2_alb ? 1 : 0
  name                = "${var.name_prefix}-${var.environment}-asg"
  min_size            = 1
  max_size            = 1
  desired_capacity    = 1
  vpc_zone_identifier = var.private_subnet_ids
  target_group_arns   = [aws_lb_target_group.app[0].arn]

  launch_template {
    id      = aws_launch_template.app[0].id
    version = "$Latest"
  }

  tag {
    key                 = "Name"
    value               = "${var.name_prefix}-${var.environment}-app"
    propagate_at_launch = true
  }
}
