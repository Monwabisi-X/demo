# Deploys the immutable backend image on a private ARM64 EC2 host. API, migrations, and the
# Bull worker run as separate systemd-supervised containers. No secret value enters user data.

data "aws_ami" "al2023_ecs_arm" {
  count       = var.enable_ec2_alb ? 1 : 0
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["amzn2023-ami-ecs-hvm-*-arm64"]
  }
  filter {
    name   = "architecture"
    values = ["arm64"]
  }
}

resource "aws_cloudwatch_log_group" "api" {
  count             = var.enable_ec2_alb ? 1 : 0
  name              = "/${var.name_prefix}/${var.environment}/api"
  retention_in_days = var.log_retention_days
  kms_key_id        = var.kms_key_arn
}

resource "aws_cloudwatch_log_group" "worker" {
  count             = var.enable_ec2_alb ? 1 : 0
  name              = "/${var.name_prefix}/${var.environment}/worker"
  retention_in_days = var.log_retention_days
  kms_key_id        = var.kms_key_arn
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
  count                = var.enable_ec2_alb ? 1 : 0
  name                 = "${var.name_prefix}-${var.environment}-tg"
  port                 = 3000
  protocol             = "HTTP"
  vpc_id               = var.vpc_id
  target_type          = "instance"
  deregistration_delay = 30

  health_check {
    path                = "/ready"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
    matcher             = "200"
  }
}

resource "aws_lb_listener" "http_forward" {
  count             = var.enable_ec2_alb && !var.enable_https ? 1 : 0
  load_balancer_arn = aws_lb.this[0].arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app[0].arn
  }
}

resource "aws_lb_listener" "http_redirect" {
  count             = var.enable_ec2_alb && var.enable_https ? 1 : 0
  load_balancer_arn = aws_lb.this[0].arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "redirect"
    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

resource "aws_lb_listener" "https" {
  count             = var.enable_ec2_alb && var.enable_https ? 1 : 0
  load_balancer_arn = aws_lb.this[0].arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = var.certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app[0].arn
  }

  lifecycle {
    precondition {
      condition     = var.certificate_arn != ""
      error_message = "enable_https=true requires an ACM certificate ARN in the ALB region."
    }
  }
}

resource "aws_route53_record" "api" {
  count   = var.enable_ec2_alb && var.api_domain_name != "" && var.route53_zone_id != "" ? 1 : 0
  zone_id = var.route53_zone_id
  name    = var.api_domain_name
  type    = "A"

  alias {
    name                   = aws_lb.this[0].dns_name
    zone_id                = aws_lb.this[0].zone_id
    evaluate_target_health = true
  }
}

resource "aws_launch_template" "app" {
  count         = var.enable_ec2_alb ? 1 : 0
  name_prefix   = "${var.name_prefix}-${var.environment}-app-"
  image_id      = data.aws_ami.al2023_ecs_arm[0].id
  instance_type = var.instance_type

  iam_instance_profile { name = var.instance_profile_name }
  vpc_security_group_ids = [var.app_sg_id]

  user_data = base64encode(templatefile("${path.module}/user_data.sh.tftpl", {
    image_uri                 = var.backend_image_uri
    ecr_registry_host         = var.ecr_registry_host
    region                    = var.region
    rds_master_secret_arn     = var.rds_master_secret_arn
    jwt_secret_arn            = var.jwt_secret_arn
    encryption_key_secret_arn = var.encryption_key_secret_arn
    db_name                   = var.db_name
    runtime_env_b64 = base64encode(join("\n", [
      for key in sort(keys(var.runtime_env)) : "${key}=${var.runtime_env[key]}"
    ]))
    api_log_group    = aws_cloudwatch_log_group.api[0].name
    worker_log_group = aws_cloudwatch_log_group.worker[0].name
  }))

  metadata_options {
    http_tokens                 = "required"
    http_endpoint               = "enabled"
    http_put_response_hop_limit = 2
  }

  block_device_mappings {
    device_name = "/dev/xvda"
    ebs {
      encrypted   = true
      kms_key_id  = var.kms_key_arn
      volume_type = "gp3"
      volume_size = 20
    }
  }

  tag_specifications {
    resource_type = "instance"
    tags          = { Name = "${var.name_prefix}-${var.environment}-app" }
  }

  lifecycle {
    precondition {
      condition     = can(regex("@sha256:[0-9a-f]{64}$", var.backend_image_uri))
      error_message = "enable_ec2_alb=true requires backend_image_uri pinned to an immutable sha256 digest."
    }
    precondition {
      condition     = var.ecr_repository_url != "" && startswith(var.backend_image_uri, "${var.ecr_repository_url}@sha256:")
      error_message = "backend_image_uri must reference the ECR repository managed by this stack."
    }
    precondition {
      condition     = var.environment != "production" || var.enable_https
      error_message = "Production compute requires HTTPS."
    }
  }
}

resource "aws_autoscaling_group" "app" {
  count                     = var.enable_ec2_alb ? 1 : 0
  name                      = "${var.name_prefix}-${var.environment}-asg"
  min_size                  = 1
  max_size                  = 2
  desired_capacity          = 1
  vpc_zone_identifier       = var.private_subnet_ids
  target_group_arns         = [aws_lb_target_group.app[0].arn]
  health_check_type         = "ELB"
  health_check_grace_period = 300

  launch_template {
    id      = aws_launch_template.app[0].id
    version = aws_launch_template.app[0].latest_version
  }

  instance_refresh {
    strategy = "Rolling"
    preferences {
      min_healthy_percentage = 100
      instance_warmup        = 300
    }
  }

  tag {
    key                 = "Name"
    value               = "${var.name_prefix}-${var.environment}-app"
    propagate_at_launch = true
  }
}
