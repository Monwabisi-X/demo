# Private, versioned, KMS-encrypted S3 bucket for client documents. The backend
# authorizes direct presigned S3 delivery; the legacy CloudFront path remains optional.
# Public access is blocked in every mode.

resource "random_id" "suffix" {
  byte_length = 4
}

resource "aws_s3_bucket" "documents" {
  bucket = "${var.name_prefix}-${var.environment}-documents-${random_id.suffix.hex}"

  lifecycle {
    prevent_destroy = true
  }

  tags = { Name = "${var.name_prefix}-${var.environment}-documents" }
}

resource "aws_s3_bucket_public_access_block" "documents" {
  bucket                  = aws_s3_bucket.documents.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_versioning" "documents" {
  bucket = aws_s3_bucket.documents.id
  versioning_configuration { status = "Enabled" }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "documents" {
  bucket = aws_s3_bucket.documents.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = var.kms_key_arn
    }
    bucket_key_enabled = true
  }
}

# Lifecycle: clean up incomplete uploads to avoid silent storage cost.
resource "aws_s3_bucket_lifecycle_configuration" "documents" {
  bucket = aws_s3_bucket.documents.id
  rule {
    id     = "abort-incomplete-multipart"
    status = "Enabled"
    filter {} # applies to all objects
    abort_incomplete_multipart_upload { days_after_initiation = 7 }
  }
}

# ── CloudFront + Origin Access Control (S3 stays private) ─────────────────────────
resource "aws_cloudfront_origin_access_control" "documents" {
  count                             = var.enable_cloudfront ? 1 : 0
  name                              = "${var.name_prefix}-${var.environment}-oac"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_distribution" "documents" {
  count               = var.enable_cloudfront ? 1 : 0
  enabled             = true
  comment             = "${var.name_prefix}-${var.environment} private document delivery"
  default_root_object = ""
  # PriceClass_100 = cheapest edge footprint (NA + EU); adequate for ZA + admin use.
  price_class = "PriceClass_100"

  origin {
    domain_name              = aws_s3_bucket.documents.bucket_regional_domain_name
    origin_id                = "s3-documents"
    origin_access_control_id = aws_cloudfront_origin_access_control.documents[0].id
  }

  default_cache_behavior {
    target_origin_id       = "s3-documents"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    forwarded_values {
      query_string = false
      cookies { forward = "none" }
    }
    min_ttl     = 0
    default_ttl = 300
    max_ttl     = 3600
  }

  restrictions {
    geo_restriction { restriction_type = "none" }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = { Name = "${var.name_prefix}-${var.environment}-cf" }
}

# Bucket policy: allow ONLY this CloudFront distribution (via OAC) to read objects.
data "aws_iam_policy_document" "bucket_policy" {
  count = var.enable_cloudfront ? 1 : 0
  statement {
    sid       = "AllowCloudFrontOAC"
    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.documents.arn}/*"]
    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }
    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_cloudfront_distribution.documents[0].arn]
    }
  }
}

resource "aws_s3_bucket_policy" "documents" {
  count  = var.enable_cloudfront ? 1 : 0
  bucket = aws_s3_bucket.documents.id
  policy = data.aws_iam_policy_document.bucket_policy[0].json
}
