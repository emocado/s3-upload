# --- Archive Files for Lambdas ---

data "archive_file" "create_task_def" {
  type        = "zip"
  source_file = "${path.module}/lambdas/provisioner/createTaskDef.js"
  output_path = "${path.module}/dist/createTaskDef.zip"
}

data "archive_file" "manage_target_group" {
  type        = "zip"
  source_file = "${path.module}/lambdas/provisioner/manageTargetGroup.js"
  output_path = "${path.module}/dist/manageTargetGroup.zip"
}

data "archive_file" "manage_ecs_service" {
  type        = "zip"
  source_file = "${path.module}/lambdas/provisioner/manageEcsService.js"
  output_path = "${path.module}/dist/manageEcsService.zip"
}

data "archive_file" "manage_alb_rules" {
  type        = "zip"
  source_file = "${path.module}/lambdas/provisioner/manageAlbRules.js"
  output_path = "${path.module}/dist/manageAlbRules.zip"
}

data "archive_file" "manage_kafka_topics" {
  type        = "zip"
  source_file = "${path.module}/lambdas/provisioner/manageKafkaTopics.js"
  output_path = "${path.module}/dist/manageKafkaTopics.zip"
}

data "archive_file" "check_health" {
  type        = "zip"
  source_file = "${path.module}/lambdas/provisioner/checkHealth.js"
  output_path = "${path.module}/dist/checkHealth.zip"
}

data "archive_file" "finalize_metadata" {
  type        = "zip"
  source_file = "${path.module}/lambdas/provisioner/finalizeMetadata.js"
  output_path = "${path.module}/dist/finalizeMetadata.zip"
}

data "archive_file" "cleanup" {
  type        = "zip"
  source_file = "${path.module}/lambdas/provisioner/cleanup.js"
  output_path = "${path.module}/dist/cleanup.zip"
}

data "archive_file" "preview_api_handler" {
  type        = "zip"
  source_file = "${path.module}/lambdas/provisioner/previewApiHandler.js"
  output_path = "${path.module}/dist/previewApiHandler.zip"
}

data "archive_file" "unzip_s3_files" {
  type        = "zip"
  source_file = "${path.module}/lambdas/unzipS3Files.js"
  output_path = "${path.module}/dist/unzipS3Files.zip"
}

# --- IAM Role for Provisioner Lambdas ---

resource "aws_iam_role" "provisioner_lambda" {
  name = "${var.project_name}-provisioner-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy" "provisioner_policy" {
  name = "ProvisionerFullPolicy"
  role = aws_iam_role.provisioner_lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "ECS"
        Effect = "Allow"
        Action = [
          "ecs:DescribeTaskDefinition",
          "ecs:RegisterTaskDefinition",
          "ecs:DeregisterTaskDefinition",
          "ecs:CreateService",
          "ecs:UpdateService",
          "ecs:DeleteService",
          "ecs:DescribeServices",
          "ecs:ListTasks",
          "ecs:StopTask",
          "ecs:TagResource"
        ]
        Resource = "*"
      },
      {
        Sid    = "ELB"
        Effect = "Allow"
        Action = [
          "elasticloadbalancing:CreateTargetGroup",
          "elasticloadbalancing:DeleteTargetGroup",
          "elasticloadbalancing:DescribeTargetGroups",
          "elasticloadbalancing:DescribeTargetHealth",
          "elasticloadbalancing:CreateRule",
          "elasticloadbalancing:DeleteRule",
          "elasticloadbalancing:DescribeRules",
          "elasticloadbalancing:AddTags"
        ]
        Resource = "*"
      },
      {
        Sid    = "DynamoDB"
        Effect = "Allow"
        Action = [
          "dynamodb:PutItem",
          "dynamodb:GetItem",
          "dynamodb:DeleteItem",
          "dynamodb:Scan",
          "dynamodb:UpdateItem"
        ]
        Resource = aws_dynamodb_table.preview_metadata.arn
      },
      {
        Sid    = "S3"
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.preview_assets.arn,
          "${aws_s3_bucket.preview_assets.arn}/*"
        ]
      },
      {
        Sid    = "PassRole"
        Effect = "Allow"
        Action = "iam:PassRole"
        Resource = "*"
      },
      {
        Sid    = "StepFunctions"
        Effect = "Allow"
        Action = [
          "states:StartExecution",
          "states:DescribeExecution",
          "states:StopExecution"
        ]
        Resource = "*"
      },
      {
        Sid    = "LambdaInvoke"
        Effect = "Allow"
        Action = "lambda:InvokeFunction"
        Resource = "*"
      },
      {
        Sid    = "Logs"
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })
}

# --- Lambda Functions ---

# 1. CreateTaskDef
resource "aws_lambda_function" "create_task_def" {
  filename         = data.archive_file.create_task_def.output_path
  function_name    = "${var.project_name}-create-task-def"
  role             = aws_iam_role.provisioner_lambda.arn
  handler          = "createTaskDef.handler"
  runtime          = "nodejs20.x"
  source_code_hash = data.archive_file.create_task_def.output_base64sha256
  timeout          = 30

  environment {
    variables = {
      BASELINE_TASK_DEF_ARN = aws_ecs_task_definition.baseline.arn
      ALB_DNS_NAME          = aws_lb.main.dns_name
    }
  }
}

# 2. ManageTargetGroup
resource "aws_lambda_function" "manage_target_group" {
  filename         = data.archive_file.manage_target_group.output_path
  function_name    = "${var.project_name}-manage-target-group"
  role             = aws_iam_role.provisioner_lambda.arn
  handler          = "manageTargetGroup.handler"
  runtime          = "nodejs20.x"
  source_code_hash = data.archive_file.manage_target_group.output_base64sha256
  timeout          = 30

  environment {
    variables = {
      VPC_ID = var.vpc_id
    }
  }
}

# 3. ManageEcsService
resource "aws_lambda_function" "manage_ecs_service" {
  filename         = data.archive_file.manage_ecs_service.output_path
  function_name    = "${var.project_name}-manage-ecs-service"
  role             = aws_iam_role.provisioner_lambda.arn
  handler          = "manageEcsService.handler"
  runtime          = "nodejs20.x"
  source_code_hash = data.archive_file.manage_ecs_service.output_base64sha256
  timeout          = 60

  environment {
    variables = {
      ECS_CLUSTER_NAME       = aws_ecs_cluster.main.name
      SUBNET_IDS             = join(",", var.subnet_ids)
      ECS_SECURITY_GROUP_IDS = aws_security_group.ecs_sg.id
    }
  }
}

# 4. ManageAlbRules
resource "aws_lambda_function" "manage_alb_rules" {
  filename         = data.archive_file.manage_alb_rules.output_path
  function_name    = "${var.project_name}-manage-alb-rules"
  role             = aws_iam_role.provisioner_lambda.arn
  handler          = "manageAlbRules.handler"
  runtime          = "nodejs20.x"
  source_code_hash = data.archive_file.manage_alb_rules.output_base64sha256
  timeout          = 30

  environment {
    variables = {
      ALB_LISTENER_ARN = aws_lb_listener.http.arn
    }
  }
}

# 5. ManageKafkaTopics
resource "aws_lambda_function" "manage_kafka_topics" {
  filename         = data.archive_file.manage_kafka_topics.output_path
  function_name    = "${var.project_name}-manage-kafka-topics"
  role             = aws_iam_role.provisioner_lambda.arn
  handler          = "manageKafkaTopics.handler"
  runtime          = "nodejs20.x"
  source_code_hash = data.archive_file.manage_kafka_topics.output_base64sha256
  timeout          = 30
}

# 6. CheckHealth
resource "aws_lambda_function" "check_health" {
  filename         = data.archive_file.check_health.output_path
  function_name    = "${var.project_name}-check-health"
  role             = aws_iam_role.provisioner_lambda.arn
  handler          = "checkHealth.handler"
  runtime          = "nodejs20.x"
  source_code_hash = data.archive_file.check_health.output_base64sha256
  timeout          = 15
}

# 7. FinalizeMetadata
resource "aws_lambda_function" "finalize_metadata" {
  filename         = data.archive_file.finalize_metadata.output_path
  function_name    = "${var.project_name}-finalize-metadata"
  role             = aws_iam_role.provisioner_lambda.arn
  handler          = "finalizeMetadata.handler"
  runtime          = "nodejs20.x"
  source_code_hash = data.archive_file.finalize_metadata.output_base64sha256
  timeout          = 15

  environment {
    variables = {
      METADATA_TABLE = aws_dynamodb_table.preview_metadata.name
      ALB_DNS_NAME   = aws_lb.main.dns_name
    }
  }
}

# 8. UnzipS3Files Lambda (using existing layer for unzipper if available or standard)
resource "aws_lambda_function" "unzip_s3_files" {
  filename         = data.archive_file.unzip_s3_files.output_path
  function_name    = "${var.project_name}-unzip-s3-files"
  role             = aws_iam_role.provisioner_lambda.arn
  handler          = "unzipS3Files.handler"
  runtime          = "nodejs20.x"
  source_code_hash = data.archive_file.unzip_s3_files.output_base64sha256
  timeout          = 120
  memory_size      = 512

  layers = [
    "arn:aws:lambda:ap-southeast-1:470972348114:layer:unzipS3Files:1"
  ]

  environment {
    variables = {
      DESTINATION_BUCKET = aws_s3_bucket.preview_assets.id
    }
  }
}

# S3 Bucket Notification to trigger unzipS3Files on ZIP upload to deploy/
resource "aws_lambda_permission" "allow_s3_unzip" {
  statement_id  = "AllowS3InvokeUnzip"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.unzip_s3_files.function_name
  principal     = "s3.amazonaws.com"
  source_arn    = aws_s3_bucket.preview_assets.arn
}

resource "aws_s3_bucket_notification" "bucket_notification" {
  bucket = aws_s3_bucket.preview_assets.id

  lambda_function {
    lambda_function_arn = aws_lambda_function.unzip_s3_files.arn
    events              = ["s3:ObjectCreated:*"]
    filter_prefix       = "deploy/"
    filter_suffix       = ".zip"
  }

  depends_on = [aws_lambda_permission.allow_s3_unzip]
}

# 9. Cleanup Lambda
resource "aws_lambda_function" "cleanup" {
  filename         = data.archive_file.cleanup.output_path
  function_name    = "${var.project_name}-cleanup"
  role             = aws_iam_role.provisioner_lambda.arn
  handler          = "cleanup.handler"
  runtime          = "nodejs20.x"
  source_code_hash = data.archive_file.cleanup.output_base64sha256
  timeout          = 60

  environment {
    variables = {
      METADATA_TABLE  = aws_dynamodb_table.preview_metadata.name
      DESTROY_SFN_ARN = aws_sfn_state_machine.destroy_preview.arn
    }
  }
}

# 10. PreviewApiHandler Lambda
resource "aws_lambda_function" "preview_api_handler" {
  filename         = data.archive_file.preview_api_handler.output_path
  function_name    = "${var.project_name}-api-handler"
  role             = aws_iam_role.provisioner_lambda.arn
  handler          = "previewApiHandler.handler"
  runtime          = "nodejs20.x"
  source_code_hash = data.archive_file.preview_api_handler.output_base64sha256
  timeout          = 30

  environment {
    variables = {
      METADATA_TABLE          = aws_dynamodb_table.preview_metadata.name
      CREATE_SFN_ARN          = aws_sfn_state_machine.create_preview.arn
      DESTROY_SFN_ARN         = aws_sfn_state_machine.destroy_preview.arn
      PREVIEW_BUCKET          = aws_s3_bucket.preview_assets.id
      ALB_DNS_NAME            = aws_lb.main.dns_name
      UNZIP_LAMBDA_NAME       = aws_lambda_function.unzip_s3_files.function_name
      PREVIEW_TTL_HOURS       = tostring(var.preview_ttl_hours)
      MAX_CONCURRENT_PREVIEWS = tostring(var.max_concurrent_previews)
    }
  }
}
