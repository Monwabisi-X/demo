output "frontend_bucket_name" {
  description = "Private SSE-S3 frontend bucket name (null when disabled)."
  value       = var.enabled ? aws_s3_bucket.frontend[0].bucket : null
}

output "frontend_bucket_arn" {
  description = "Private SSE-S3 frontend bucket ARN (null when disabled)."
  value       = var.enabled ? aws_s3_bucket.frontend[0].arn : null
}

output "frontend_cloudfront_domain_name" {
  description = "Frontend CloudFront domain name (null when disabled)."
  value       = var.enabled ? aws_cloudfront_distribution.frontend[0].domain_name : null
}

output "frontend_cloudfront_distribution_id" {
  description = "Frontend CloudFront distribution ID (null when disabled)."
  value       = var.enabled ? aws_cloudfront_distribution.frontend[0].id : null
}
