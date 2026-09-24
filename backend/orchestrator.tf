# 1. IAM Role for Step Functions
resource "aws_iam_role" "step_functions" {
  name = "${var.project_name}-sfn-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "states.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy" "step_functions_policy" {
  name = "SFNLambdaInvokePolicy"
  role = aws_iam_role.step_functions.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action   = ["lambda:InvokeFunction"]
        Effect   = "Allow"
        Resource = "*"
      },
      {
        Action = [
          "logs:CreateLogDelivery",
          "logs:GetLogDelivery",
          "logs:UpdateLogDelivery",
          "logs:DeleteLogDelivery",
          "logs:ListLogDeliveries",
          "logs:PutResourcePolicy",
          "logs:DescribeResourcePolicies",
          "logs:DescribeLogGroups"
        ]
        Effect   = "Allow"
        Resource = "*"
      }
    ]
  })
}

# 2. Step Function: Create Preview Environment
resource "aws_sfn_state_machine" "create_preview" {
  name     = "${var.project_name}-create"
  role_arn = aws_iam_role.step_functions.arn

  definition = jsonencode({
    Comment = "Create Preview Environment Workflow"
    StartAt = "CreateKafkaTopics"
    States = {
      CreateKafkaTopics = {
        Type       = "Task"
        Resource   = "arn:aws:states:::lambda:invoke"
        OutputPath = "$.Payload"
        Parameters = {
          "FunctionName" = aws_lambda_function.manage_kafka_topics.arn
          "Payload.$"    = "$"
        }
        Next  = "CreateTaskDef"
        Catch = [{
          ErrorEquals = ["States.ALL"]
          ResultPath  = "$.error"
          Next        = "HandleFailure"
        }]
      }

      CreateTaskDef = {
        Type       = "Task"
        Resource   = "arn:aws:states:::lambda:invoke"
        OutputPath = "$.Payload"
        Parameters = {
          "FunctionName" = aws_lambda_function.create_task_def.arn
          "Payload.$"    = "$"
        }
        Next  = "ManageTargetGroup"
        Catch = [{
          ErrorEquals = ["States.ALL"]
          ResultPath  = "$.error"
          Next        = "HandleFailure"
        }]
      }

      ManageTargetGroup = {
        Type       = "Task"
        Resource   = "arn:aws:states:::lambda:invoke"
        OutputPath = "$.Payload"
        Parameters = {
          "FunctionName" = aws_lambda_function.manage_target_group.arn
          "Payload.$"    = "$"
        }
        Next  = "AddAlbRules"
        Catch = [{
          ErrorEquals = ["States.ALL"]
          ResultPath  = "$.error"
          Next        = "HandleFailure"
        }]
      }

      AddAlbRules = {
        Type       = "Task"
        Resource   = "arn:aws:states:::lambda:invoke"
        OutputPath = "$.Payload"
        Parameters = {
          "FunctionName" = aws_lambda_function.manage_alb_rules.arn
          "Payload.$"    = "$"
        }
        Next  = "ManageEcsService"
        Catch = [{
          ErrorEquals = ["States.ALL"]
          ResultPath  = "$.error"
          Next        = "HandleFailure"
        }]
      }

      ManageEcsService = {
        Type       = "Task"
        Resource   = "arn:aws:states:::lambda:invoke"
        OutputPath = "$.Payload"
        Parameters = {
          "FunctionName" = aws_lambda_function.manage_ecs_service.arn
          "Payload.$"    = "$"
        }
        Next  = "WaitForHealthy"
        Catch = [{
          ErrorEquals = ["States.ALL"]
          ResultPath  = "$.error"
          Next        = "HandleFailure"
        }]
      }

      WaitForHealthy = {
        Type    = "Wait"
        Seconds = 15
        Next    = "CheckHealth"
      }

      CheckHealth = {
        Type       = "Task"
        Resource   = "arn:aws:states:::lambda:invoke"
        OutputPath = "$.Payload"
        Parameters = {
          "FunctionName" = aws_lambda_function.check_health.arn
          "Payload.$"    = "$"
        }
        Next = "FinalizeSuccess"
        Catch = [{
          ErrorEquals = ["States.ALL"]
          ResultPath  = "$.error"
          Next        = "FinalizeSuccess"
        }]
      }

      FinalizeSuccess = {
        Type       = "Task"
        Resource   = "arn:aws:states:::lambda:invoke"
        OutputPath = "$.Payload"
        Parameters = {
          "FunctionName" = aws_lambda_function.finalize_metadata.arn
          "Payload": {
            "previewName.$"    = "$.previewName"
            "taskDefArn.$"     = "$.taskDefArn"
            "targetGroupArn.$" = "$.targetGroupArn"
            "serviceArn.$"     = "$.serviceArn"
            "ruleArn.$"        = "$.ruleArn"
            "priority.$"       = "$.priority"
            "kafkaTopic.$"     = "$.kafkaTopic"
            "status"           = "ACTIVE"
          }
        }
        End = true
      }

      HandleFailure = {
        Type       = "Task"
        Resource   = "arn:aws:states:::lambda:invoke"
        OutputPath = "$.Payload"
        Parameters = {
          "FunctionName" = aws_lambda_function.finalize_metadata.arn
          "Payload": {
            "previewName.$" = "$.previewName"
            "status"        = "FAILED"
            "errorMessage"  = "Provisioning failed"
          }
        }
        Next = "FailState"
      }

      FailState = {
        Type  = "Fail"
        Cause = "Provisioning Failed"
      }
    }
  })
}

# 3. Step Function: Destroy Preview Environment
resource "aws_sfn_state_machine" "destroy_preview" {
  name     = "${var.project_name}-destroy"
  role_arn = aws_iam_role.step_functions.arn

  definition = jsonencode({
    Comment = "Destroy Preview Environment Workflow"
    StartAt = "DeleteAlbRules"
    States = {
      DeleteAlbRules = {
        Type       = "Task"
        Resource   = "arn:aws:states:::lambda:invoke"
        ResultPath = "$.albResult"
        Parameters = {
          "FunctionName" = aws_lambda_function.manage_alb_rules.arn
          "Payload": {
            "action"        = "delete"
            "previewName.$" = "$.previewName"
            "ruleArn.$"     = "$.ruleArn"
          }
        }
        Next = "StopEcsService"
      }

      StopEcsService = {
        Type       = "Task"
        Resource   = "arn:aws:states:::lambda:invoke"
        ResultPath = "$.ecsResult"
        Parameters = {
          "FunctionName" = aws_lambda_function.manage_ecs_service.arn
          "Payload": {
            "action"        = "delete"
            "previewName.$" = "$.previewName"
            "serviceName.$" = "$.serviceName"
          }
        }
        Next = "WaitForDrain"
      }

      WaitForDrain = {
        Type    = "Wait"
        Seconds = 10
        Next    = "DeleteTargetGroup"
      }

      DeleteTargetGroup = {
        Type       = "Task"
        Resource   = "arn:aws:states:::lambda:invoke"
        ResultPath = "$.tgResult"
        Parameters = {
          "FunctionName" = aws_lambda_function.manage_target_group.arn
          "Payload": {
            "action"           = "delete"
            "previewName.$"    = "$.previewName"
            "targetGroupArn.$" = "$.targetGroupArn"
          }
        }
        Next = "CleanupKafka"
      }

      CleanupKafka = {
        Type       = "Task"
        Resource   = "arn:aws:states:::lambda:invoke"
        ResultPath = "$.kafkaResult"
        Parameters = {
          "FunctionName" = aws_lambda_function.manage_kafka_topics.arn
          "Payload": {
            "action"        = "delete"
            "previewName.$" = "$.previewName"
          }
        }
        Next = "FinalizeDestroy"
      }

      FinalizeDestroy = {
        Type       = "Task"
        Resource   = "arn:aws:states:::lambda:invoke"
        ResultPath = "$.finalizeResult"
        Parameters = {
          "FunctionName" = aws_lambda_function.finalize_metadata.arn
          "Payload": {
            "previewName.$" = "$.previewName"
            "status"        = "DESTROYED"
          }
        }
        End = true
      }
    }
  })
}

# 4. Scheduled Cleanup EventBridge Rule (Every 30 minutes)
resource "aws_cloudwatch_event_rule" "cleanup_schedule" {
  name                = "${var.project_name}-cleanup-schedule"
  description         = "Trigger preview auto-cleanup every 30 minutes"
  schedule_expression = "rate(30 minutes)"
}

resource "aws_cloudwatch_event_target" "cleanup_target" {
  rule      = aws_cloudwatch_event_rule.cleanup_schedule.name
  target_id = "CleanupLambda"
  arn       = aws_lambda_function.cleanup.arn
}

resource "aws_lambda_permission" "allow_cloudwatch_cleanup" {
  statement_id  = "AllowExecutionFromCloudWatch"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.cleanup.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.cleanup_schedule.arn
}
