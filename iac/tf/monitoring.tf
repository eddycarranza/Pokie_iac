# ─────────────────────────────────────────────
# Monitoreo y Observabilidad
# CloudWatch + Synthetics + SNS + Dashboard
# ─────────────────────────────────────────────

resource "aws_sns_topic" "alerts" {
  name              = "${var.project_name}-alerts"
  kms_master_key_id = aws_kms_key.main.id
}

resource "aws_sns_topic_subscription" "alerts_email" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = "equipo@${var.domain_name}"
}

# Fix CKV2_AWS_62: policy del topic para permitir que S3 (notificaciones de
# eventos de los buckets) y CloudWatch Alarms puedan publicar en él.
resource "aws_sns_topic_policy" "alerts" {
  arn = aws_sns_topic.alerts.arn

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowS3Publish"
        Effect    = "Allow"
        Principal = { Service = "s3.amazonaws.com" }
        Action    = "SNS:Publish"
        Resource  = aws_sns_topic.alerts.arn
        Condition = {
          ArnLike = {
            "aws:SourceArn" = "arn:aws:s3:::${var.project_name}-*"
          }
        }
      },
      {
        Sid       = "AllowCloudWatchPublish"
        Effect    = "Allow"
        Principal = { Service = "cloudwatch.amazonaws.com" }
        Action    = "SNS:Publish"
        Resource  = aws_sns_topic.alerts.arn
      }
    ]
  })
}

# Alarma: errores HTTP 500 > 1% en 5 minutos
resource "aws_cloudwatch_metric_alarm" "api_5xx_errors" {
  alarm_name          = "${var.project_name}-api-5xx-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "5XXError"
  namespace           = "AWS/ApiGateway"
  period              = 300
  statistic           = "Average"
  threshold           = 1
  alarm_description   = "Errores HTTP 500 superan 1% en 5 minutos"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    ApiName = aws_api_gateway_rest_api.main.name
  }
}

# Alarma: latencia mayor a 1 segundo (p95)
resource "aws_cloudwatch_metric_alarm" "api_latency" {
  alarm_name          = "${var.project_name}-api-latency"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "Latency"
  namespace           = "AWS/ApiGateway"
  period              = 300
  extended_statistic  = "p95"
  threshold           = 1000
  alarm_description   = "Latencia p95 supera 1 segundo"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    ApiName = aws_api_gateway_rest_api.main.name
  }
}

# Alarma: mensajes en la Dead Letter Queue
resource "aws_cloudwatch_metric_alarm" "dlq_messages" {
  alarm_name          = "${var.project_name}-dlq-messages"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ApproximateNumberOfMessagesVisible"
  namespace           = "AWS/SQS"
  period              = 300
  statistic           = "Sum"
  threshold           = 0
  alarm_description   = "Hay pedidos fallidos en la Dead Letter Queue"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    QueueName = aws_sqs_queue.orders_dlq.name
  }
}

resource "aws_synthetics_canary" "health_check" {
  name                 = "${var.project_name}-health-canary"
  artifact_s3_location = "s3://${aws_s3_bucket.canary_artifacts.bucket}/canary"
  execution_role_arn   = aws_iam_role.canary_role.arn
  handler              = "canary.handler"
  zip_file             = data.archive_file.canary_placeholder.output_path
  runtime_version      = "syn-nodejs-puppeteer-7.0"

  schedule {
    expression = "rate(30 seconds)"
  }
}

resource "aws_s3_bucket" "canary_artifacts" {
  bucket = "${var.project_name}-canary-artifacts"
}

# Fix CKV_AWS_53/54/55/56: bloquear acceso público al bucket de artefactos.
resource "aws_s3_bucket_public_access_block" "canary_artifacts" {
  bucket = aws_s3_bucket.canary_artifacts.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Fix CKV_AWS_21: versionado habilitado.
resource "aws_s3_bucket_versioning" "canary_artifacts" {
  bucket = aws_s3_bucket.canary_artifacts.id

  versioning_configuration {
    status = "Enabled"
  }
}

# Fix CKV2_AWS_61: ciclo de vida para no acumular artefactos indefinidamente.
resource "aws_s3_bucket_lifecycle_configuration" "canary_artifacts" {
  bucket = aws_s3_bucket.canary_artifacts.id

  rule {
    id     = "retencion-30-dias"
    status = "Enabled"

    expiration {
      days = 30
    }

    # Fix CKV_AWS_300: limpiar uploads multipart incompletos.
    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}

# Fix CKV2_AWS_62: notificación de eventos del bucket de artefactos del canary.
resource "aws_s3_bucket_notification" "canary_artifacts" {
  bucket = aws_s3_bucket.canary_artifacts.id

  topic {
    topic_arn = aws_sns_topic.alerts.arn
    events    = ["s3:ObjectCreated:*", "s3:ObjectRemoved:*"]
  }

  depends_on = [aws_sns_topic_policy.alerts]
}

# Fix CKV_AWS_18: access logging del bucket de artefactos del canary.
resource "aws_s3_bucket_logging" "canary_artifacts" {
  bucket        = aws_s3_bucket.canary_artifacts.id
  target_bucket = aws_s3_bucket.access_logs.id
  target_prefix = "canary-artifacts-logs/"
}

resource "aws_s3_bucket_server_side_encryption_configuration" "canary_artifacts" {
  bucket = aws_s3_bucket.canary_artifacts.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.main.arn
    }
  }
}

resource "aws_iam_role" "canary_role" {
  name = "${var.project_name}-canary-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

# Permisos mínimos para que el canary escriba sus resultados y logs.
resource "aws_iam_role_policy" "canary_role_policy" {
  name = "${var.project_name}-canary-role-policy"
  role = aws_iam_role.canary_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "S3Artifacts"
        Effect = "Allow"
        Action = ["s3:PutObject", "s3:GetBucketLocation"]
        Resource = [
          aws_s3_bucket.canary_artifacts.arn,
          "${aws_s3_bucket.canary_artifacts.arn}/*"
        ]
      },
      {
        Sid    = "Logs"
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:${var.aws_region}:*:*"
      },
      {
        Sid      = "CloudWatchMetrics"
        Effect   = "Allow"
        Action   = ["cloudwatch:PutMetricData"]
        Resource = "*"
      }
    ]
  })
}

resource "aws_cloudwatch_dashboard" "business" {
  dashboard_name = "${var.project_name}-business-dashboard"

  dashboard_body = jsonencode({
    widgets = [
      {
        type = "metric"
        properties = {
          title   = "Pedidos por hora"
          metrics = [["AWS/SQS", "NumberOfMessagesSent", "QueueName", aws_sqs_queue.orders.name]]
          period  = 3600
        }
      },
      {
        type = "metric"
        properties = {
          title   = "Errores y latencia API"
          metrics = [["AWS/ApiGateway", "5XXError"], ["AWS/ApiGateway", "Latency"]]
          period  = 60
        }
      }
    ]
  })
}
