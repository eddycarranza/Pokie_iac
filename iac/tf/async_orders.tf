# ─────────────────────────────────────────────
# Procesamiento Asíncrono de Pedidos
# SQS -> Step Functions -> Lambdas (stock-check, purchase-confirmation, send-order-email)
# ─────────────────────────────────────────────

resource "aws_sqs_queue" "orders_dlq" {
  name                      = "${var.project_name}-orders-dlq"
  message_retention_seconds = 1209600 # 14 días
  kms_master_key_id         = aws_kms_key.main.id
}

resource "aws_sqs_queue" "orders" {
  name                       = "${var.project_name}-orders-queue"
  visibility_timeout_seconds = 30
  kms_master_key_id          = aws_kms_key.main.id

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.orders_dlq.arn
    maxReceiveCount     = 3
  })
}

resource "aws_sqs_queue" "throttling_contingency" {
  name              = "${var.project_name}-throttling-contingency"
  kms_master_key_id = aws_kms_key.main.id
}

locals {
  async_lambdas = {
    stock_check           = "Lambda consultar-stock: verificar stock"
    purchase_confirmation = "Lambda compra-confirmacion: confirmar en RDS"
    send_order_email      = "Lambda send-order-email"
  }
}

resource "aws_lambda_function" "async" {
  for_each = local.async_lambdas

  function_name    = "${var.project_name}-${each.key}"
  description      = each.value
  runtime          = "nodejs20.x"
  handler          = "index.handler"
  filename         = data.archive_file.lambda_placeholder.output_path
  source_code_hash = data.archive_file.lambda_placeholder.output_base64sha256
  role             = aws_iam_role.lambda_exec.arn
  timeout          = 30
  memory_size      = 256

  # Optimización de costos: ARM64 (Graviton2) — 20 % más barato por GB-segundo.
  architectures = ["arm64"]

  # Fix CKV_AWS_115: límite de concurrencia por función.
  reserved_concurrent_executions = 20

  # Fix CKV_AWS_272: solo desplegar código firmado por nuestro Signing Profile.
  code_signing_config_arn = aws_lambda_code_signing_config.main.arn

  vpc_config {
    subnet_ids         = [aws_subnet.private_a.id, aws_subnet.private_b.id]
    security_group_ids = [aws_security_group.lambda_sg.id]
  }

  environment {
    variables = {
      DB_SECRET_ARN             = aws_secretsmanager_secret.db_credentials.arn
      NODE_ENV                  = var.environment
      ORDER_NOTIFICATIONS_TOPIC = aws_sns_topic.order_notifications.arn
    }
  }

  # Fix CKV_AWS_173: cifrar las variables de entorno con la KMS key propia.
  kms_key_arn = aws_kms_key.main.arn

  tracing_config {
    mode = "Active"
  }

  # Fix CKV_AWS_116: capturar invocaciones fallidas en la DLQ.
  dead_letter_config {
    target_arn = aws_sqs_queue.orders_dlq.arn
  }

  tags = {
    Name = "${var.project_name}-${each.key}"
  }
}

# Fix CKV_AWS_338/CKV_AWS_158: log group propio con retención y cifrado KMS
# para cada Lambda asíncrona (si no, AWS crea uno sin retención/KMS por defecto).
resource "aws_cloudwatch_log_group" "async_lambda_logs" {
  for_each = local.async_lambdas

  name = "/aws/lambda/${var.project_name}-${each.key}"
  # Fix CKV_AWS_338: retención de al menos 1 año (antes 90 días).
  retention_in_days = 365
  kms_key_id        = aws_kms_key.main.arn
}

resource "aws_lambda_event_source_mapping" "orders_to_stock_check" {
  event_source_arn = aws_sqs_queue.orders.arn
  function_name    = aws_lambda_function.async["stock_check"].arn
  batch_size       = 1
}

resource "aws_sfn_state_machine" "orders_orchestrator" {
  name     = "${var.project_name}-orders-orchestrator"
  role_arn = aws_iam_role.step_functions_role.arn

  definition = jsonencode({
    Comment = "Orquesta verificación de stock, confirmación de compra y envío de email"
    StartAt = "VerificarStock"
    States = {
      VerificarStock = {
        Type     = "Task"
        Resource = aws_lambda_function.async["stock_check"].arn
        Next     = "ConfirmarCompra"
        Retry = [{
          ErrorEquals     = ["States.ALL"]
          MaxAttempts     = 3
          IntervalSeconds = 2
          BackoffRate     = 2.0
        }]
      }
      ConfirmarCompra = {
        Type     = "Task"
        Resource = aws_lambda_function.async["purchase_confirmation"].arn
        Next     = "EnviarEmail"
      }
      EnviarEmail = {
        Type     = "Task"
        Resource = aws_lambda_function.async["send_order_email"].arn
        End      = true
      }
    }
  })

  logging_configuration {
    log_destination        = "${aws_cloudwatch_log_group.sfn_logs.arn}:*"
    include_execution_data = true
    level                  = "ALL"
  }

  # Fix CKV_AWS_284: X-Ray tracing en la propia máquina de estados
  # (antes solo estaba activo en las Lambdas individuales).
  tracing_configuration {
    enabled = true
  }
}

resource "aws_cloudwatch_log_group" "sfn_logs" {
  name = "/aws/states/${var.project_name}-orchestrator"
  # Fix CKV_AWS_338: retención de al menos 1 año (antes 90 días).
  retention_in_days = 365
  kms_key_id        = aws_kms_key.main.arn
}

resource "aws_iam_role" "step_functions_role" {
  name = "${var.project_name}-sfn-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "states.amazonaws.com" }
    }]
  })
}

# Permisos mínimos: invocar las 3 Lambdas del flujo y escribir logging.
resource "aws_iam_role_policy" "step_functions_policy" {
  name = "${var.project_name}-sfn-policy"
  role = aws_iam_role.step_functions_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "InvokeAsyncLambdas"
        Effect   = "Allow"
        Action   = ["lambda:InvokeFunction"]
        Resource = [for fn in aws_lambda_function.async : fn.arn]
      },
      {
        Sid    = "StepFunctionsLogging"
        Effect = "Allow"
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
        Resource = "*"
      },
      {
        Sid    = "XRayTracing"
        Effect = "Allow"
        Action = [
          "xray:PutTraceSegments",
          "xray:PutTelemetryRecords",
          "xray:GetSamplingRules",
          "xray:GetSamplingTargets"
        ]
        Resource = "*"
      }
    ]
  })
}

# Amazon SES para el email de confirmación
resource "aws_ses_email_identity" "orders" {
  email = "pedidos@${var.domain_name}"
}

# ─────────────────────────────────────────────
# Amazon SNS — Notificaciones de pedidos al cliente
# La Lambda send-order-email publica aquí el evento de pedido confirmado
# (último paso del flujo asíncrono del diagrama).
# ─────────────────────────────────────────────
resource "aws_sns_topic" "order_notifications" {
  name              = "${var.project_name}-order-notifications"
  kms_master_key_id = aws_kms_key.main.id

  tags = {
    Name = "${var.project_name}-order-notifications"
  }
}

# Suscripción de ejemplo: avisa al equipo de cada pedido confirmado.
# (El cliente recibe su email vía SES; SNS sirve para fan-out a otros canales.)
resource "aws_sns_topic_subscription" "order_notifications_email" {
  topic_arn = aws_sns_topic.order_notifications.arn
  protocol  = "email"
  endpoint  = "pedidos@${var.domain_name}"
}
