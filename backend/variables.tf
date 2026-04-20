variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "vpc_id" {
  type        = string
  description = "The ID of the VPC where Lambdas will be deployed"
}

variable "subnet_ids" {
  type        = list(string)
  description = "List of subnet IDs for Lambda VPC configuration"
}

variable "project_name" {
  type    = string
  default = "ecs-dashboard"
}
