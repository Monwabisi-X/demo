output "alb_dns_name" {
  value = var.enable_ec2_alb ? aws_lb.this[0].dns_name : null
}
output "target_group_arn" {
  value = var.enable_ec2_alb ? aws_lb_target_group.app[0].arn : null
}
