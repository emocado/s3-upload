output "api_endpoint" {
  value       = "${aws_api_gateway_stage.prod.invoke_url}"
  description = "The root URL of the API Gateway stage"
}

output "s3_bucket_name" {
  value = aws_s3_bucket.uploads.id
}

output "ecs_cluster_name" {
  value = aws_ecs_cluster.main.name
}

output "ecs_service_name" {
  value = aws_ecs_service.app_service.name
}

output "user_pool_id" {
  value = aws_cognito_user_pool.pool.id
}

output "cognito_domain_url" {
  value = "https://${aws_cognito_user_pool_domain.main.domain}.auth.${var.aws_region}.amazoncognito.com"
}

output "client_creds_id" {
  value = aws_cognito_user_pool_client.client_creds.id
}

output "client_creds_secret" {
  value     = aws_cognito_user_pool_client.client_creds.client_secret
  sensitive = true
}

output "web_client_id" {
  value = aws_cognito_user_pool_client.web_client.id
}

output "cognito_issuer" {
  value = "https://cognito-idp.${var.aws_region}.amazonaws.com/${aws_cognito_user_pool.pool.id}"
}

output "iot_endpoint" {
  value       = data.aws_iot_endpoint.data.endpoint_address
  description = "The AWS IoT Core Data-ATS endpoint"
}
