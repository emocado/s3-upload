locals {
  developer_names = [for i in range(1, 12) : "dev-${i}"]
}

# 1. IoT Things for Developers
resource "aws_iot_thing" "dev" {
  for_each = toset(local.developer_names)
  name     = each.key
}

# 2. Private Keys for Developers
resource "tls_private_key" "dev" {
  for_each  = toset(local.developer_names)
  algorithm = "RSA"
  rsa_bits  = 2048
}

# 3. CSR for Developers
resource "tls_cert_request" "dev" {
  for_each        = toset(local.developer_names)
  private_key_pem = tls_private_key.dev[each.key].private_key_pem

  subject {
    common_name  = each.key
    organization = var.project_name
  }
}

# 4. IoT Certificates for Developers (Signed by AWS)
resource "aws_iot_certificate" "dev" {
  for_each = toset(local.developer_names)
  csr      = tls_cert_request.dev[each.key].cert_request_pem
  active   = true
}

# 5. Attach Certs to Things
resource "aws_iot_thing_principal_attachment" "dev_attachment" {
  for_each  = toset(local.developer_names)
  principal = aws_iot_certificate.dev[each.key].arn
  thing     = aws_iot_thing.dev[each.key].name
}

# 5. IoT Policies
resource "aws_iot_policy" "dev_policy" {
  name = "${var.project_name}-developer-policy"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "iot:Connect",
          "iot:Publish",
          "iot:Subscribe",
          "iot:Receive"
        ]
        Effect   = "Allow"
        Resource = "*"
      }
    ]
  })
}

resource "aws_iot_policy" "ecs_app_policy" {
  name = "${var.project_name}-ecs-app-policy"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "iot:Connect",
          "iot:Publish",
          "iot:Subscribe",
          "iot:Receive"
        ]
        Effect   = "Allow"
        Resource = "*"
      }
    ]
  })
}

# 6. Attach Policies
# Attach DevPolicy to each certificate
resource "aws_iot_policy_attachment" "dev_policy_attach" {
  for_each = toset(local.developer_names)
  policy   = aws_iot_policy.dev_policy.name
  target   = aws_iot_certificate.dev[each.key].arn
}

# Attach ECSAppPolicy to the ECS Task Role ARN
# resource "aws_iot_policy_attachment" "ecs_app_policy_attach" {
#   policy = aws_iot_policy.ecs_app_policy.name
#   target = aws_iam_role.ecs_task_role.arn
# }

# 7. Secrets Manager for Developer Certificates
resource "aws_secretsmanager_secret" "dev_certs" {
  for_each = toset(local.developer_names)
  name     = "${var.project_name}/iot/${each.key}-certs"
  
  # Allow deletion without delay for testing/demo
  recovery_window_in_days = 0 
}

resource "aws_secretsmanager_secret_version" "dev_certs" {
  for_each  = toset(local.developer_names)
  secret_id = aws_secretsmanager_secret.dev_certs[each.key].id
  secret_string = jsonencode({
    private_key      = tls_private_key.dev[each.key].private_key_pem
    public_key       = tls_private_key.dev[each.key].public_key_pem
    certificate_pem  = aws_iot_certificate.dev[each.key].certificate_pem
  })
}

# 8. IoT Logging
resource "aws_cloudwatch_log_group" "iot_logs" {
  name              = "/aws/iot/logs"
  retention_in_days = 14
}

resource "aws_iot_logging_options" "main" {
  default_log_level = "INFO"
  role_arn          = aws_iam_role.iot_logging.arn
}
