variable "aws_region" {
  type        = string
  default     = "ap-southeast-1"
  description = "AWS region"
}

variable "vpc_id" {
  type        = string
  default     = "vpc-c403c2a2"
  description = "The ID of the VPC where ECS services, MSK, and ALB reside"
}

variable "subnet_ids" {
  type        = list(string)
  default     = [
    "subnet-0ef28a15cb676dd34",
    "subnet-0e61af086a066cc04"
  ]
  description = "List of subnet IDs across at least 2 AZs for ALB, ECS, and MSK"
}

variable "project_name" {
  type        = string
  default     = "preview-poc"
  description = "Project name prefix"
}

variable "max_concurrent_previews" {
  type        = number
  default     = 10
  description = "Maximum number of concurrent preview environments"
}

variable "preview_ttl_hours" {
  type        = number
  default     = 4
  description = "Auto-cleanup previews after N hours"
}

variable "container_image" {
  type        = string
  default     = "470972348114.dkr.ecr.ap-southeast-1.amazonaws.com/ecs-dashboard-service:node-backend"
  description = "Default Node.js backend container image"
}
