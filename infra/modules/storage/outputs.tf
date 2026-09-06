output "bucket_name" { value = aws_s3_bucket.documents.bucket }
output "bucket_arn" { value = aws_s3_bucket.documents.arn }
output "cloudfront_domain_name" {
  value = var.enable_cloudfront ? aws_cloudfront_distribution.documents[0].domain_name : null
}
output "cloudfront_distribution_id" {
  value = var.enable_cloudfront ? aws_cloudfront_distribution.documents[0].id : null
}
