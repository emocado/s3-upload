output "api_endpoint" {
  value       = aws_api_gateway_stage.prod.invoke_url
  description = "The root URL of the Preview Management API Gateway stage"
}

output "alb_dns_name" {
  value       = aws_lb.main.dns_name
  description = "DNS name of the Main Preview Application Load Balancer"
}

output "alb_http_url" {
  value       = "http://${aws_lb.main.dns_name}"
  description = "HTTP URL of the Main Preview Application Load Balancer"
}

output "preview_assets_bucket" {
  value       = aws_s3_bucket.preview_assets.id
  description = "S3 bucket for preview frontend assets"
}

output "dynamodb_table_name" {
  value       = aws_dynamodb_table.preview_metadata.name
  description = "DynamoDB table storing preview metadata"
}

output "ecs_cluster_name" {
  value       = aws_ecs_cluster.main.name
  description = "ECS Cluster Name"
}

output "msk_cluster_arn" {
  value       = aws_msk_serverless_cluster.preview_msk.arn
  description = "MSK Serverless Cluster ARN"
}

output "create_step_function_arn" {
  value       = aws_sfn_state_machine.create_preview.arn
  description = "Step Function ARN for creating previews"
}

output "destroy_step_function_arn" {
  value       = aws_sfn_state_machine.destroy_preview.arn
  description = "Step Function ARN for destroying previews"
}
