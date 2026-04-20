# Security Group for Lambdas
resource "aws_security_group" "lambda_sg" {
  name        = "${var.project_name}-lambda-sg"
  description = "Common SG for all project lambdas"
  vpc_id      = var.vpc_id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# Zipping Lambda source files
data "archive_file" "get_presigned_url" {
  type        = "zip"
  source_file = "${path.module}/lambdas/getPresignedUrl.js"
  output_path = "${path.module}/dist/getPresignedUrl.zip"
}

data "archive_file" "get_services_status" {
  type        = "zip"
  source_file = "${path.module}/lambdas/getServicesStatus.js"
  output_path = "${path.module}/dist/getServicesStatus.zip"
}

data "archive_file" "get_task_def" {
  type        = "zip"
  source_file = "${path.module}/lambdas/getTaskDefinition.js"
  output_path = "${path.module}/dist/getTaskDefinition.zip"
}

data "archive_file" "update_task_def" {
  type        = "zip"
  source_file = "${path.module}/lambdas/updateTaskDefinition.js"
  output_path = "${path.module}/dist/updateTaskDefinition.zip"
}

data "archive_file" "restart_service" {
  type        = "zip"
  source_file = "${path.module}/lambdas/restartService.js"
  output_path = "${path.module}/dist/restartService.zip"
}

# 1. getPresignedUrl Lambda
resource "aws_lambda_function" "get_presigned_url" {
  filename         = data.archive_file.get_presigned_url.output_path
  function_name    = "${var.project_name}-get-presigned-url"
  role             = aws_iam_role.get_presigned_url.arn
  handler          = "getPresignedUrl.handler"
  runtime          = "nodejs18.x"
  source_code_hash = data.archive_file.get_presigned_url.output_base64sha256

  vpc_config {
    subnet_ids         = var.subnet_ids
    security_group_ids = [aws_security_group.lambda_sg.id]
  }

  environment {
    variables = {
      S3_BUCKET = aws_s3_bucket.uploads.id
    }
  }
}

# 2. getServicesStatus Lambda
resource "aws_lambda_function" "get_services_status" {
  filename         = data.archive_file.get_services_status.output_path
  function_name    = "${var.project_name}-get-services-status"
  role             = aws_iam_role.get_services_status.arn
  handler          = "getServicesStatus.handler"
  runtime          = "nodejs18.x"
  source_code_hash = data.archive_file.get_services_status.output_base64sha256
  timeout          = 30

  vpc_config {
    subnet_ids         = var.subnet_ids
    security_group_ids = [aws_security_group.lambda_sg.id]
  }

  environment {
    variables = {
      CLUSTER_NAME = aws_ecs_cluster.main.name
    }
  }
}

# 3. getTaskDefinition Lambda
resource "aws_lambda_function" "get_task_def" {
  filename         = data.archive_file.get_task_def.output_path
  function_name    = "${var.project_name}-get-task-def"
  role             = aws_iam_role.get_task_def.arn
  handler          = "getTaskDefinition.handler"
  runtime          = "nodejs18.x"
  source_code_hash = data.archive_file.get_task_def.output_base64sha256

  vpc_config {
    subnet_ids         = var.subnet_ids
    security_group_ids = [aws_security_group.lambda_sg.id]
  }

  environment {
    variables = {
      CLUSTER_NAME = aws_ecs_cluster.main.name
    }
  }
}

# 4. updateTaskDefinition Lambda
resource "aws_lambda_function" "update_task_def" {
  filename         = data.archive_file.update_task_def.output_path
  function_name    = "${var.project_name}-update-task-def"
  role             = aws_iam_role.update_task_def.arn
  handler          = "updateTaskDefinition.handler"
  runtime          = "nodejs18.x"
  source_code_hash = data.archive_file.update_task_def.output_base64sha256

  vpc_config {
    subnet_ids         = var.subnet_ids
    security_group_ids = [aws_security_group.lambda_sg.id]
  }
}

# 5. restartService Lambda
resource "aws_lambda_function" "restart_service" {
  filename         = data.archive_file.restart_service.output_path
  function_name    = "${var.project_name}-restart-service"
  role             = aws_iam_role.restart_service.arn
  handler          = "restartService.handler"
  runtime          = "nodejs18.x"
  source_code_hash = data.archive_file.restart_service.output_base64sha256

  vpc_config {
    subnet_ids         = var.subnet_ids
    security_group_ids = [aws_security_group.lambda_sg.id]
  }

  environment {
    variables = {
      CLUSTER_NAME = aws_ecs_cluster.main.name
    }
  }
}
