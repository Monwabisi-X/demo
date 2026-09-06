output "alb_dns_name" {
  value = var.enable_ec2_alb ? aws_lb.this[0].dns_name : null
}
output "alb_zone_id" {
  value = var.enable_ec2_alb ? aws_lb.this[0].zone_id : null
}
output "target_group_arn" {
  value = var.enable_ec2_alb ? aws_lb_target_group.app[0].arn : null
}
output "autoscaling_group_name" {
  value = var.enable_ec2_alb ? aws_autoscaling_group.app[0].name : null
}
output "api_url" {
  value = var.enable_ec2_alb ? (
    var.api_domain_name != "" ? "${var.enable_https ? "https" : "http"}://${var.api_domain_name}" :
    "${var.enable_https ? "https" : "http"}://${aws_lb.this[0].dns_name}"
  ) : null
}
output "api_log_group_arn" {
  value = var.enable_ec2_alb ? aws_cloudwatch_log_group.api[0].arn : null
}
output "worker_log_group_arn" {
  value = var.enable_ec2_alb ? aws_cloudwatch_log_group.worker[0].arn : null
}
