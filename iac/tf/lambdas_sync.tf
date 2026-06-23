# ─────────────────────────────────────────────
# Lambdas Síncronas (API Gateway -> Lambda -> RDS)
# auth | catalogo | pedidos | gastos
# ─────────────────────────────────────────────

locals {
  sync_lambdas = {
    auth     = "Autenticación: iniciar sesión / registrarse"
    catalogo = "Catálogo: obtener productos"
    pedidos  = "Pedidos: POST -> SQS"
    gastos   = "Gastos"
  }
}

resource "aws_lambda_function" "sync" {
  for_each = local.sync_lambdas

  function_name = "${var.project_name}-${each.key}"
  description   = each.value
  runtime       = "nodejs20.x"
  # El bundle real (que despliega Ansible) expone el handler en lambda.js,
  # un wrapper de serverless-http sobre la app Express del backend/.
  handler          = "lambda.handler"
  filename         = data.archive_file.lambda_placeholder.output_path
  source_code_hash = data.archive_file.lambda_placeholder.output_base64sha256
  role             = aws_iam_role.lambda_exec.arn
  timeout          = 10
  memory_size      = 256

  # Publica una versión inmutable en cada cambio de código. Necesario para que
  # el alias apunte a una versión concreta y poder usar Provisioned Concurrency.
  publish = true

  # Fix CKV_AWS_272: solo desplegar código firmado por nuestro Signing Profile.
  code_signing_config_arn = aws_lambda_code_signing_config.main.arn

  vpc_config {
    subnet_ids         = [aws_subnet.private_a.id, aws_subnet.private_b.id]
    security_group_ids = [aws_security_group.lambda_sg.id]
  }

  environment {
    variables = {
      DB_SECRET_ARN = aws_secretsmanager_secret.db_credentials.arn
      NODE_ENV      = var.environment
    }
  }

  # Fix CKV_AWS_173: cifrar las variables de entorno con la KMS key propia
  # (sin esto, Lambda usa la key por defecto de AWS, menos auditable).
  kms_key_arn = aws_kms_key.main.arn

  tracing_config {
    mode = "Active"
  }

  # Fix CKV_AWS_116: capturar invocaciones fallidas (asíncronas) en la DLQ.
  dead_letter_config {
    target_arn = aws_sqs_queue.orders_dlq.arn
  }

  reserved_concurrent_executions = 50

  tags = {
    Name = "${var.project_name}-${each.key}"
  }
}

resource "aws_lambda_alias" "sync_live" {
  for_each = local.sync_lambdas

  name             = "live"
  function_name    = aws_lambda_function.sync[each.key].function_name
  function_version = aws_lambda_function.sync[each.key].version
}

# Provisioned Concurrency en las Lambdas críticas (auth y pedidos).
# Solo se crea si var.provisioned_concurrency > 0 (default 0 = sin costo).
locals {
  critical_sync_lambdas = var.provisioned_concurrency > 0 ? toset(["auth", "pedidos"]) : toset([])
}

resource "aws_lambda_provisioned_concurrency_config" "sync" {
  for_each = local.critical_sync_lambdas

  function_name                     = aws_lambda_function.sync[each.value].function_name
  provisioned_concurrent_executions = var.provisioned_concurrency
  qualifier                         = aws_lambda_alias.sync_live[each.value].name
}

resource "aws_cloudwatch_log_group" "sync_lambda_logs" {
  for_each = local.sync_lambdas

  name = "/aws/lambda/${var.project_name}-${each.key}"
  # Fix CKV_AWS_338: retención de al menos 1 año (antes 90 días).
  retention_in_days = 365
  kms_key_id        = aws_kms_key.main.arn
}
