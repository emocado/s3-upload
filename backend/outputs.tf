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
