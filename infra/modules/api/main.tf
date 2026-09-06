# API Gateway (HTTP API) + Lambda for the Smile ID identity-verification integration.
# Lambda + HTTP API are on-demand (pay-per-use) so they cost effectively nothing at rest.

data "archive_file" "smile_id" {
  count       = var.enable_api_lambda ? 1 : 0
  type        = "zip"
  source_dir  = "${path.module}/lambda_src"
  output_path = "${path.module}/build/smile_id.zip"
}

resource "aws_lambda_function" "smile_id" {
  count            = var.enable_api_lambda ? 1 : 0
  function_name    = "${var.name_prefix}-${var.environment}-smile-id"
  role             = var.lambda_role_arn
  runtime          = "nodejs20.x"
  handler          = "index.handler"
  filename         = data.archive_file.smile_id[0].output_path
  source_code_hash = data.archive_file.smile_id[0].output_base64sha256
  timeout          = 15
  memory_size      = 256

  environment {
    variables = {
      SMILE_ID_SECRET_ARN = var.smile_id_secret_arn
    }
  }

  tags = { Name = "${var.name_prefix}-${var.environment}-smile-id" }
}

# Allow the Lambda to read ONLY the Smile ID secret.
data "aws_iam_policy_document" "lambda_secret_read" {
  count = var.enable_api_lambda ? 1 : 0
  statement {
    actions   = ["secretsmanager:GetSecretValue"]
    resources = [var.smile_id_secret_arn]
  }
}

resource "aws_iam_role_policy" "lambda_secret_read" {
  count  = var.enable_api_lambda ? 1 : 0
  name   = "${var.name_prefix}-${var.environment}-lambda-smileid-secret"
  role   = element(split("/", var.lambda_role_arn), length(split("/", var.lambda_role_arn)) - 1)
  policy = data.aws_iam_policy_document.lambda_secret_read[0].json
}

resource "aws_apigatewayv2_api" "this" {
  count         = var.enable_api_lambda ? 1 : 0
  name          = "${var.name_prefix}-${var.environment}-api"
  protocol_type = "HTTP"
  tags          = { Name = "${var.name_prefix}-${var.environment}-api" }
}

resource "aws_apigatewayv2_integration" "smile_id" {
  count                  = var.enable_api_lambda ? 1 : 0
  api_id                 = aws_apigatewayv2_api.this[0].id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.smile_id[0].invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "smile_id" {
  count     = var.enable_api_lambda ? 1 : 0
  api_id    = aws_apigatewayv2_api.this[0].id
  route_key = "POST /verify-identity"
  target    = "integrations/${aws_apigatewayv2_integration.smile_id[0].id}"
}

resource "aws_apigatewayv2_stage" "default" {
  count       = var.enable_api_lambda ? 1 : 0
  api_id      = aws_apigatewayv2_api.this[0].id
  name        = "$default"
  auto_deploy = true
}

resource "aws_lambda_permission" "apigw" {
  count         = var.enable_api_lambda ? 1 : 0
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.smile_id[0].function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.this[0].execution_arn}/*/*"
}
