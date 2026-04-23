# Common assume role policy
data "aws_iam_policy_document" "lambda_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

# 1. getPresignedUrl Role
resource "aws_iam_role" "get_presigned_url" {
  name               = "${var.project_name}-get-presigned-url-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
}

resource "aws_iam_role_policy" "get_presigned_url_s3" {
  name = "S3PutPermission"
  role = aws_iam_role.get_presigned_url.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action   = ["s3:PutObject"]
      Effect   = "Allow"
      Resource = "${aws_s3_bucket.uploads.arn}/*"
    }]
  })
}

# 2. getServicesStatus Role
resource "aws_iam_role" "get_services_status" {
  name               = "${var.project_name}-get-services-status-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
}

resource "aws_iam_role_policy" "get_services_status_ecs_ecr" {
  name = "ECSECRReadPermission"
  role = aws_iam_role.get_services_status.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action   = ["ecs:ListServices", "ecs:DescribeServices"]
        Effect   = "Allow"
        Resource = "*"
      },
      {
        Action   = ["ecr:DescribeImages", "ecr:ListImages"]
        Effect   = "Allow"
        Resource = "*"
      }
    ]
  })
}

# 3. getTaskDefinition Role
resource "aws_iam_role" "get_task_def" {
  name               = "${var.project_name}-get-task-def-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
}

resource "aws_iam_role_policy" "get_task_def_ecs" {
  name = "ECSDescribePermission"
  role = aws_iam_role.get_task_def.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action   = ["ecs:DescribeServices", "ecs:DescribeTaskDefinition", "ecs:ListTaskDefinitions"]
      Effect   = "Allow"
      Resource = "*"
    }]
  })
}

# 4. updateTaskDefinition Role
resource "aws_iam_role" "update_task_def" {
  name               = "${var.project_name}-update-task-def-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
}

resource "aws_iam_role_policy" "update_task_def_ecs" {
  name = "ECSRegisterPermission"
  role = aws_iam_role.update_task_def.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action   = ["ecs:RegisterTaskDefinition"]
      Effect   = "Allow"
      Resource = "*"
    },{
      Action   = [
          "iam:PassRole",
        ]
      Effect   = "Allow"
      Resource = "*"
    }]
  })
}

# 5. restartService Role
resource "aws_iam_role" "restart_service" {
  name               = "${var.project_name}-restart-service-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
}

resource "aws_iam_role_policy" "restart_service_ecs" {
  name = "ECSUpdatePermission"
  role = aws_iam_role.restart_service.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action   = ["ecs:UpdateService"]
      Effect   = "Allow"
      Resource = "*"
    },{
      Action   = [
          "iam:PassRole",
        ]
      Effect   = "Allow"
      Resource = "*"
    }]
  })
}

# Attach VPC Access managed policy to all roles
resource "aws_iam_role_policy_attachment" "vpc_access" {
  for_each   = toset([
    aws_iam_role.get_presigned_url.name,
    aws_iam_role.get_services_status.name,
    aws_iam_role.get_task_def.name,
    aws_iam_role.update_task_def.name,
    aws_iam_role.restart_service.name
  ])
  role       = each.key
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}

# 6. IoT Logging Role
resource "aws_iam_role" "iot_logging" {
  name = "${var.project_name}-iot-logging-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "iot.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy" "iot_logging" {
  name = "IoTLoggingPolicy"
  role = aws_iam_role.iot_logging.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents",
        "logs:DescribeLogGroups",
        "logs:DescribeLogStreams"
      ]
      Effect   = "Allow"
      Resource = "*"
    }]
  })
}

# 7. ECS Task Role (IoT Access)
resource "aws_iam_role" "ecs_task_role" {
  name = "${var.project_name}-ecs-task-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ecs-tasks.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy" "ecs_task_iot" {
  name = "ECSAppIoTPolicy"
  role = aws_iam_role.ecs_task_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = [
        "iot:Connect",
        "iot:Publish",
        "iot:Subscribe",
        "iot:Receive",
        "iot:GetThingShadow",
        "iot:UpdateThingShadow"
      ]
      Effect   = "Allow"
      Resource = "*"
    }]
  })
}

# 8. ECS Task Execution Role
resource "aws_iam_role" "ecs_execution_role" {
  name = "${var.project_name}-ecs-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ecs-tasks.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_execution_standard" {
  role       = aws_iam_role.ecs_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}
