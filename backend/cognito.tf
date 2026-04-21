# Random string for unique cognito domain
resource "random_string" "suffix" {
  length  = 6
  special = false
  upper   = false
}

# Cognito User Pool
resource "aws_cognito_user_pool" "pool" {
  name = "${var.project_name}-user-pool"

  admin_create_user_config {
    allow_admin_create_user_only = false
  }

  auto_verified_attributes = ["email"]

  password_policy {
    minimum_length    = 8
    require_lowercase = true
    require_numbers   = true
    require_symbols   = true
    require_uppercase = true
  }
}

# User Pool Domain (needed for Hosted UI and /oauth2/token)
resource "aws_cognito_user_pool_domain" "main" {
  domain       = "ecs-dash-${random_string.suffix.result}"
  user_pool_id = aws_cognito_user_pool.pool.id
}

# Resource Server (To enable custom scopes for Client Credentials)
resource "aws_cognito_resource_server" "api" {
  identifier = "ecs-api"
  name       = "ECS Management API"
  user_pool_id = aws_cognito_user_pool.pool.id

  scope {
    scope_name        = "all"
    scope_description = "Full access to the ECS management API"
  }
}

# App Client 1: Client Credentials Flow (M2M)
resource "aws_cognito_user_pool_client" "client_creds" {
  name                                 = "client-credentials-client"
  user_pool_id                         = aws_cognito_user_pool.pool.id
  generate_secret                      = true
  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_flows                  = ["client_credentials"]
  allowed_oauth_scopes                 = ["${aws_cognito_resource_server.api.identifier}/all"]
  explicit_auth_flows                  = ["ADMIN_NO_SRP_AUTH"]
  supported_identity_providers         = ["COGNITO"]

  depends_on = [aws_cognito_resource_server.api]
}

# App Client 2: Hosted UI Flow (Web)
resource "aws_cognito_user_pool_client" "web_client" {
  name                                 = "web-hosted-ui-client"
  user_pool_id                         = aws_cognito_user_pool.pool.id
  generate_secret                      = false # False for frontend security (PKCE)
  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_flows                  = ["code"]
  allowed_oauth_scopes                 = ["openid", "email", "profile", "${aws_cognito_resource_server.api.identifier}/all"]
  callback_urls                        = ["http://localhost:5173", "http://localhost:7777"]
  supported_identity_providers         = ["COGNITO"]
}

# Default Admin User
resource "aws_cognito_user" "admin" {
  user_pool_id = aws_cognito_user_pool.pool.id
  username     = "admin@example.com"
  password     = "Password123!"

  attributes = {
    email          = "admin@example.com"
    email_verified = true
  }
}
