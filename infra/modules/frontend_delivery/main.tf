# Private static-site origin for the frontend. This module is deliberately separate from
# the KMS-encrypted document bucket and its legacy CloudFront distribution.

resource "random_id" "frontend_suffix" {
  count       = var.enabled ? 1 : 0
  byte_length = 4
}

resource "aws_s3_bucket" "frontend" {
  count  = var.enabled ? 1 : 0
  bucket = "${var.name_prefix}-${var.environment}-frontend-${random_id.frontend_suffix[0].hex}"

  tags = { Name = "${var.name_prefix}-${var.environment}-frontend" }
}

resource "aws_s3_bucket_public_access_block" "frontend" {
  count                   = var.enabled ? 1 : 0
  bucket                  = aws_s3_bucket.frontend[0].id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "frontend" {
  count  = var.enabled ? 1 : 0
  bucket = aws_s3_bucket.frontend[0].id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_cloudfront_origin_access_control" "frontend" {
  count                             = var.enabled ? 1 : 0
  name                              = "${var.name_prefix}-${var.environment}-frontend-oac"
  description                       = "OAC for the private ${var.environment} frontend bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

data "aws_cloudfront_cache_policy" "caching_disabled" {
  count = var.enabled ? 1 : 0
  name  = "Managed-CachingDisabled"
}

data "aws_cloudfront_cache_policy" "caching_optimized" {
  count = var.enabled ? 1 : 0
  name  = "Managed-CachingOptimized"
}

resource "aws_cloudfront_distribution" "frontend" {
  count               = var.enabled ? 1 : 0
  enabled             = true
  comment             = "${var.name_prefix}-${var.environment} frontend delivery"
  default_root_object = "index.html"
  price_class         = "PriceClass_100"

  origin {
    domain_name              = aws_s3_bucket.frontend[0].bucket_regional_domain_name
    origin_id                = "s3-frontend"
    origin_access_control_id = aws_cloudfront_origin_access_control.frontend[0].id
  }

  default_cache_behavior {
    target_origin_id       = "s3-frontend"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true
    cache_policy_id        = data.aws_cloudfront_cache_policy.caching_disabled[0].id
  }

  ordered_cache_behavior {
    path_pattern           = "/assets/*"
    target_origin_id       = "s3-frontend"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true
    cache_policy_id        = data.aws_cloudfront_cache_policy.caching_optimized[0].id
  }

  custom_error_response {
    error_code            = 403
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 0
  }

  custom_error_response {
    error_code            = 404
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 0
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = { Name = "${var.name_prefix}-${var.environment}-frontend-cf" }
}

data "aws_iam_policy_document" "frontend_bucket" {
  count = var.enabled ? 1 : 0

  statement {
    sid       = "AllowFrontendCloudFrontOAC"
    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.frontend[0].arn}/*"]

    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_cloudfront_distribution.frontend[0].arn]
    }
  }
}

resource "aws_s3_bucket_policy" "frontend" {
  count  = var.enabled ? 1 : 0
  bucket = aws_s3_bucket.frontend[0].id
  policy = data.aws_iam_policy_document.frontend_bucket[0].json
}
