# 1. S3 Bucket for Preview Frontend Builds
resource "aws_s3_bucket" "preview_assets" {
  bucket_prefix = "${var.project_name}-assets-"
  force_destroy = true

  tags = {
    Name = "${var.project_name}-assets"
  }
}

resource "aws_s3_bucket_public_access_block" "preview_assets" {
  bucket = aws_s3_bucket.preview_assets.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

resource "aws_s3_bucket_cors_configuration" "preview_assets" {
  bucket = aws_s3_bucket.preview_assets.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST", "HEAD"]
    allowed_origins = ["*"]
    max_age_seconds = 3000
  }
}

# 2. Package serveFrontend Lambda
data "archive_file" "serve_frontend" {
  type        = "zip"
  source_file = "${path.module}/lambdas/serveFrontend.js"
  output_path = "${path.module}/dist/serveFrontend.zip"
}

# 3. IAM Role for serveFrontend Lambda
resource "aws_iam_role" "serve_frontend" {
  name = "${var.project_name}-serve-frontend-role"

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

resource "aws_iam_role_policy" "serve_frontend_s3" {
  name = "S3ReadPermission"
  role = aws_iam_role.serve_frontend.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = ["s3:GetObject", "s3:ListBucket"]
        Effect = "Allow"
        Resource = [
          aws_s3_bucket.preview_assets.arn,
          "${aws_s3_bucket.preview_assets.arn}/*"
        ]
      },
      {
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Effect   = "Allow"
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })
}

# 4. Lambda function to serve frontend from S3 via ALB
resource "aws_lambda_function" "serve_frontend" {
  filename         = data.archive_file.serve_frontend.output_path
  function_name    = "${var.project_name}-serve-frontend"
  role             = aws_iam_role.serve_frontend.arn
  handler          = "serveFrontend.handler"
  runtime          = "nodejs20.x"
  source_code_hash = data.archive_file.serve_frontend.output_base64sha256
  timeout          = 15
  memory_size      = 256

  environment {
    variables = {
      PREVIEW_BUCKET = aws_s3_bucket.preview_assets.id
    }
  }
}

# 5. Permission for ALB to invoke serveFrontend Lambda
resource "aws_lambda_permission" "alb_serve_frontend" {
  statement_id  = "AllowALBInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.serve_frontend.function_name
  principal     = "elasticloadbalancing.amazonaws.com"
  source_arn    = aws_lb_target_group.frontend_tg.arn
}

# 6. Attach serveFrontend Lambda to Frontend Target Group
resource "aws_lb_target_group_attachment" "frontend_lambda" {
  target_group_arn = aws_lb_target_group.frontend_tg.arn
  target_id        = aws_lambda_function.serve_frontend.arn
  depends_on       = [aws_lambda_permission.alb_serve_frontend]
}
