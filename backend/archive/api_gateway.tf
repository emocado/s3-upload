# REST API
resource "aws_api_gateway_rest_api" "main" {
  name        = "${var.project_name}-api"
  endpoint_configuration {
    types = ["REGIONAL"]
  }
}

# --- Resources ---

# /presigned-url
resource "aws_api_gateway_resource" "presigned_url" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "presigned-url"
}

# /services
resource "aws_api_gateway_resource" "services" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "services"
}

# /task-definition
resource "aws_api_gateway_resource" "task_def" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "task-definition"
}

# /update-task
resource "aws_api_gateway_resource" "update_task" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "update-task"
}

# /restart
resource "aws_api_gateway_resource" "restart" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "restart"
}

# --- Methods & Integrations ---

# Cognito Authorizer
resource "aws_api_gateway_authorizer" "cognito" {
  name                   = "cognito-authorizer"
  rest_api_id            = aws_api_gateway_rest_api.main.id
  type                   = "COGNITO_USER_POOLS"
  provider_arns          = [aws_cognito_user_pool.pool.arn]
}

# 1. getPresignedUrl (/presigned-url)
resource "aws_api_gateway_method" "presigned_url" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.presigned_url.id
  http_method   = "GET"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
  authorization_scopes = [
    "${aws_cognito_resource_server.api.identifier}/all",
  ]
}
resource "aws_api_gateway_integration" "presigned_url" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.presigned_url.id
  http_method = aws_api_gateway_method.presigned_url.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.get_presigned_url.invoke_arn
}
resource "aws_lambda_permission" "presigned_url" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.get_presigned_url.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*"
}

# CORS for /presigned-url
resource "aws_api_gateway_method" "presigned_url_cors" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.presigned_url.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}
resource "aws_api_gateway_integration" "presigned_url_cors" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.presigned_url.id
  http_method = aws_api_gateway_method.presigned_url_cors.http_method
  type        = "MOCK"
  request_templates = {
    "application/json" = "{ \"statusCode\": 200 }"
  }
}
resource "aws_api_gateway_method_response" "presigned_url_cors" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.presigned_url.id
  http_method = aws_api_gateway_method.presigned_url_cors.http_method
  status_code = "200"
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}
resource "aws_api_gateway_integration_response" "presigned_url_cors" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.presigned_url.id
  http_method = aws_api_gateway_method.presigned_url_cors.http_method
  status_code = aws_api_gateway_method_response.presigned_url_cors.status_code
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,OPTIONS,PUT'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

# 2. getServicesStatus (/services)
resource "aws_api_gateway_method" "services" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.services.id
  http_method   = "GET"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
  authorization_scopes = [
    "${aws_cognito_resource_server.api.identifier}/all",
  ]
}
resource "aws_api_gateway_integration" "services" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.services.id
  http_method = aws_api_gateway_method.services.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.get_services_status.invoke_arn
}
resource "aws_lambda_permission" "services" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.get_services_status.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*"
}

# CORS for /services
resource "aws_api_gateway_method" "services_cors" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.services.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}
resource "aws_api_gateway_integration" "services_cors" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.services.id
  http_method = aws_api_gateway_method.services_cors.http_method
  type        = "MOCK"
  request_templates = {
    "application/json" = "{ \"statusCode\": 200 }"
  }
}
resource "aws_api_gateway_method_response" "services_cors" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.services.id
  http_method = aws_api_gateway_method.services_cors.http_method
  status_code = "200"
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}
resource "aws_api_gateway_integration_response" "services_cors" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.services.id
  http_method = aws_api_gateway_method.services_cors.http_method
  status_code = aws_api_gateway_method_response.services_cors.status_code
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,OPTIONS,PUT'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

# 3. getTaskDefinition (/task-definition)
resource "aws_api_gateway_method" "task_def" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.task_def.id
  http_method   = "GET"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
  authorization_scopes = [
    "${aws_cognito_resource_server.api.identifier}/all",
  ]
}
resource "aws_api_gateway_integration" "task_def" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.task_def.id
  http_method = aws_api_gateway_method.task_def.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.get_task_def.invoke_arn
}
resource "aws_lambda_permission" "task_def" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.get_task_def.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*"
}

# CORS for /task-definition
resource "aws_api_gateway_method" "task_def_cors" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.task_def.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}
resource "aws_api_gateway_integration" "task_def_cors" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.task_def.id
  http_method = aws_api_gateway_method.task_def_cors.http_method
  type        = "MOCK"
  request_templates = {
    "application/json" = "{ \"statusCode\": 200 }"
  }
}
resource "aws_api_gateway_method_response" "task_def_cors" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.task_def.id
  http_method = aws_api_gateway_method.task_def_cors.http_method
  status_code = "200"
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}
resource "aws_api_gateway_integration_response" "task_def_cors" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.task_def.id
  http_method = aws_api_gateway_method.task_def_cors.http_method
  status_code = aws_api_gateway_method_response.task_def_cors.status_code
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,OPTIONS,PUT'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

# 4. updateTaskDefinition (/update-task)
resource "aws_api_gateway_method" "update_task" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.update_task.id
  http_method   = "POST"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
  authorization_scopes = [
    "${aws_cognito_resource_server.api.identifier}/all",
  ]
}
resource "aws_api_gateway_integration" "update_task" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.update_task.id
  http_method = aws_api_gateway_method.update_task.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.update_task_def.invoke_arn
}
resource "aws_lambda_permission" "update_task" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.update_task_def.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*"
}

# CORS for /update-task
resource "aws_api_gateway_method" "update_task_cors" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.update_task.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}
resource "aws_api_gateway_integration" "update_task_cors" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.update_task.id
  http_method = aws_api_gateway_method.update_task_cors.http_method
  type        = "MOCK"
  request_templates = {
    "application/json" = "{ \"statusCode\": 200 }"
  }
}
resource "aws_api_gateway_method_response" "update_task_cors" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.update_task.id
  http_method = aws_api_gateway_method.update_task_cors.http_method
  status_code = "200"
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}
resource "aws_api_gateway_integration_response" "update_task_cors" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.update_task.id
  http_method = aws_api_gateway_method.update_task_cors.http_method
  status_code = aws_api_gateway_method_response.update_task_cors.status_code
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,OPTIONS,PUT'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

# 5. restartService (/restart)
resource "aws_api_gateway_method" "restart" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.restart.id
  http_method   = "POST"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
  authorization_scopes = [
    "${aws_cognito_resource_server.api.identifier}/all",
  ]
}
resource "aws_api_gateway_integration" "restart" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.restart.id
  http_method = aws_api_gateway_method.restart.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.restart_service.invoke_arn
}
resource "aws_lambda_permission" "restart" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.restart_service.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*"
}

# CORS for /restart
resource "aws_api_gateway_method" "restart_cors" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.restart.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}
resource "aws_api_gateway_integration" "restart_cors" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.restart.id
  http_method = aws_api_gateway_method.restart_cors.http_method
  type        = "MOCK"
  request_templates = {
    "application/json" = "{ \"statusCode\": 200 }"
  }
}
resource "aws_api_gateway_method_response" "restart_cors" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.restart.id
  http_method = aws_api_gateway_method.restart_cors.http_method
  status_code = "200"
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}
resource "aws_api_gateway_integration_response" "restart_cors" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.restart.id
  http_method = aws_api_gateway_method.restart_cors.http_method
  status_code = aws_api_gateway_method_response.restart_cors.status_code
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,OPTIONS,PUT'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

# --- Deployment & Stage ---

resource "aws_api_gateway_deployment" "main" {
  depends_on = [
    aws_api_gateway_integration.presigned_url,
    aws_api_gateway_integration.services,
    aws_api_gateway_integration.task_def,
    aws_api_gateway_integration.update_task,
    aws_api_gateway_integration.restart,
    aws_api_gateway_integration_response.presigned_url_cors,
    aws_api_gateway_integration_response.services_cors,
    aws_api_gateway_integration_response.task_def_cors,
    aws_api_gateway_integration_response.update_task_cors,
    aws_api_gateway_integration_response.restart_cors
  ]

  rest_api_id = aws_api_gateway_rest_api.main.id
  
  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_api_gateway_stage" "prod" {
  deployment_id = aws_api_gateway_deployment.main.id
  rest_api_id   = aws_api_gateway_rest_api.main.id
  stage_name    = "prod"
}
