output "api_endpoint" {
  value = var.enable_api_lambda ? aws_apigatewayv2_api.this[0].api_endpoint : null
}
output "smile_id_function_name" {
  value = var.enable_api_lambda ? aws_lambda_function.smile_id[0].function_name : null
}
