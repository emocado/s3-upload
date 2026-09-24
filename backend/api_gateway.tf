# 1. REST API
resource "aws_api_gateway_rest_api" "preview_api" {
  name        = "${var.project_name}-api"
  description = "Preview Environments Management API"

  endpoint_configuration {
    types = ["REGIONAL"]
  }
}

# 2. Resources

# /preview
resource "aws_api_gateway_resource" "preview" {
  rest_api_id = aws_api_gateway_rest_api.preview_api.id
  parent_id   = aws_api_gateway_rest_api.preview_api.root_resource_id
  path_part   = "preview"
}

# /previews
resource "aws_api_gateway_resource" "previews" {
  rest_api_id = aws_api_gateway_rest_api.preview_api.id
  parent_id   = aws_api_gateway_rest_api.preview_api.root_resource_id
  path_part   = "previews"
}

# /presigned-url
resource "aws_api_gateway_resource" "presigned_url" {
  rest_api_id = aws_api_gateway_rest_api.preview_api.id
  parent_id   = aws_api_gateway_rest_api.preview_api.root_resource_id
  path_part   = "presigned-url"
}

# /unzip
resource "aws_api_gateway_resource" "unzip" {
  rest_api_id = aws_api_gateway_rest_api.preview_api.id
  parent_id   = aws_api_gateway_rest_api.preview_api.root_resource_id
  path_part   = "unzip"
}

# /preview/{name}
resource "aws_api_gateway_resource" "preview_name" {
  rest_api_id = aws_api_gateway_rest_api.preview_api.id
  parent_id   = aws_api_gateway_resource.preview.id
  path_part   = "{name}"
}

# /preview/{name}/{proxy+}
resource "aws_api_gateway_resource" "preview_name_proxy" {
  rest_api_id = aws_api_gateway_rest_api.preview_api.id
  parent_id   = aws_api_gateway_resource.preview_name.id
  path_part   = "{proxy+}"
}

# 3. Methods & Integrations (Lambda Proxy)

# POST /preview
resource "aws_api_gateway_method" "post_preview" {
  rest_api_id   = aws_api_gateway_rest_api.preview_api.id
  resource_id   = aws_api_gateway_resource.preview.id
  http_method   = "POST"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "post_preview" {
  rest_api_id             = aws_api_gateway_rest_api.preview_api.id
  resource_id             = aws_api_gateway_resource.preview.id
  http_method             = aws_api_gateway_method.post_preview.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.preview_api_handler.invoke_arn
}

# GET /previews
resource "aws_api_gateway_method" "get_previews" {
  rest_api_id   = aws_api_gateway_rest_api.preview_api.id
  resource_id   = aws_api_gateway_resource.previews.id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "get_previews" {
  rest_api_id             = aws_api_gateway_rest_api.preview_api.id
  resource_id             = aws_api_gateway_resource.previews.id
  http_method             = aws_api_gateway_method.get_previews.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.preview_api_handler.invoke_arn
}

# GET /presigned-url
resource "aws_api_gateway_method" "get_presigned_url" {
  rest_api_id   = aws_api_gateway_rest_api.preview_api.id
  resource_id   = aws_api_gateway_resource.presigned_url.id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "get_presigned_url" {
  rest_api_id             = aws_api_gateway_rest_api.preview_api.id
  resource_id             = aws_api_gateway_resource.presigned_url.id
  http_method             = aws_api_gateway_method.get_presigned_url.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.preview_api_handler.invoke_arn
}

# POST /unzip
resource "aws_api_gateway_method" "post_unzip" {
  rest_api_id   = aws_api_gateway_rest_api.preview_api.id
  resource_id   = aws_api_gateway_resource.unzip.id
  http_method   = "POST"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "post_unzip" {
  rest_api_id             = aws_api_gateway_rest_api.preview_api.id
  resource_id             = aws_api_gateway_resource.unzip.id
  http_method             = aws_api_gateway_method.post_unzip.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.preview_api_handler.invoke_arn
}

# ANY /preview/{name}
resource "aws_api_gateway_method" "any_preview_name" {
  rest_api_id   = aws_api_gateway_rest_api.preview_api.id
  resource_id   = aws_api_gateway_resource.preview_name.id
  http_method   = "ANY"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "any_preview_name" {
  rest_api_id             = aws_api_gateway_rest_api.preview_api.id
  resource_id             = aws_api_gateway_resource.preview_name.id
  http_method             = aws_api_gateway_method.any_preview_name.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.preview_api_handler.invoke_arn
}

# ANY /preview/{name}/{proxy+}
resource "aws_api_gateway_method" "any_preview_proxy" {
  rest_api_id   = aws_api_gateway_rest_api.preview_api.id
  resource_id   = aws_api_gateway_resource.preview_name_proxy.id
  http_method   = "ANY"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "any_preview_proxy" {
  rest_api_id             = aws_api_gateway_rest_api.preview_api.id
  resource_id             = aws_api_gateway_resource.preview_name_proxy.id
  http_method             = aws_api_gateway_method.any_preview_proxy.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.preview_api_handler.invoke_arn
}

# 4. Native OPTIONS CORS Support
locals {
  cors_resources = [
    aws_api_gateway_resource.preview.id,
    aws_api_gateway_resource.previews.id,
    aws_api_gateway_resource.presigned_url.id,
    aws_api_gateway_resource.unzip.id,
    aws_api_gateway_resource.preview_name.id,
    aws_api_gateway_resource.preview_name_proxy.id
  ]
}

resource "aws_api_gateway_method" "options" {
  count         = length(local.cors_resources)
  rest_api_id   = aws_api_gateway_rest_api.preview_api.id
  resource_id   = local.cors_resources[count.index]
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "options" {
  count       = length(local.cors_resources)
  rest_api_id = aws_api_gateway_rest_api.preview_api.id
  resource_id = local.cors_resources[count.index]
  http_method = aws_api_gateway_method.options[count.index].http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "options_200" {
  count       = length(local.cors_resources)
  rest_api_id = aws_api_gateway_rest_api.preview_api.id
  resource_id = local.cors_resources[count.index]
  http_method = aws_api_gateway_method.options[count.index].http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "options_200" {
  count       = length(local.cors_resources)
  rest_api_id = aws_api_gateway_rest_api.preview_api.id
  resource_id = local.cors_resources[count.index]
  http_method = aws_api_gateway_method.options[count.index].http_method
  status_code = aws_api_gateway_method_response.options_200[count.index].status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Preview-Env'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,OPTIONS,POST,PUT,DELETE'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }

  depends_on = [aws_api_gateway_integration.options]
}

# 5. Permission for API Gateway to invoke PreviewApiHandler Lambda
resource "aws_lambda_permission" "apigw_invoke_handler" {
  statement_id  = "AllowAPIGatewayInvokeHandler"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.preview_api_handler.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.preview_api.execution_arn}/*/*"
}

# 6. Deployment & Stage
resource "aws_api_gateway_deployment" "deployment" {
  rest_api_id = aws_api_gateway_rest_api.preview_api.id

  triggers = {
    redeployment = sha1(jsonencode([
      aws_api_gateway_resource.preview.id,
      aws_api_gateway_resource.previews.id,
      aws_api_gateway_resource.presigned_url.id,
      aws_api_gateway_resource.preview_name.id,
      aws_api_gateway_method.post_preview.id,
      aws_api_gateway_method.get_previews.id,
      aws_api_gateway_method.get_presigned_url.id,
      aws_api_gateway_method.any_preview_name.id,
      aws_api_gateway_integration.post_preview.id,
      aws_api_gateway_integration.get_previews.id,
      aws_api_gateway_integration.get_presigned_url.id,
      aws_api_gateway_integration.any_preview_name.id
    ]))
  }

  lifecycle {
    create_before_destroy = true
  }

  depends_on = [
    aws_api_gateway_integration.post_preview,
    aws_api_gateway_integration.get_previews,
    aws_api_gateway_integration.get_presigned_url,
    aws_api_gateway_integration.any_preview_name,
    aws_api_gateway_integration.any_preview_proxy,
    aws_api_gateway_integration_response.options_200
  ]
}

resource "aws_api_gateway_stage" "prod" {
  deployment_id = aws_api_gateway_deployment.deployment.id
  rest_api_id   = aws_api_gateway_rest_api.preview_api.id
  stage_name    = "prod"
}
