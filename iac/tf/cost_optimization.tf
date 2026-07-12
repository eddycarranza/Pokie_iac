# ============================================================
# Optimización de Costos y Rendimiento — Semana 14
# Pokie Cat IaC · UPAO · Infraestructura como Código
#
# Estrategias implementadas:
#   1. AWS Budgets: alerta mensual de gasto (evita sorpresas).
#   2. Lambda ARM64 (Graviton2): 20 % más barato y más rápido.
#   3. RDS: storage gp3 (ya en rds.tf) + parámetros de rendimiento.
#   4. CloudWatch Dashboard: visualización de métricas de rendimiento.
#   5. Tags de asignación de costos en todos los recursos clave.
# ============================================================

# ── 1. AWS Budget: alerta al 80 % y al 100 % del presupuesto mensual ──────
#
# Con Free Tier de AWS el costo real es ~$0.
# En producción real (Lambda + RDS + CloudFront) se estima < $60/mes.
# El presupuesto en $80 deja margen; ajusta "limit_amount" según tu plan.
resource "aws_budgets_budget" "monthly" {
  name              = "${var.project_name}-monthly-budget"
  budget_type       = "COST"
  limit_amount      = "80"
  limit_unit        = "USD"
  time_unit         = "MONTHLY"
  time_period_start = "2025-01-01_00:00"

  # Alerta al 80 % del presupuesto (gasto real)
  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_sns_topic_arns  = [aws_sns_topic.alerts.arn]
  }

  # Alerta al 100 % del presupuesto (previsión)
  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type             = "PERCENTAGE"
    notification_type          = "FORECASTED"
    subscriber_sns_topic_arns  = [aws_sns_topic.alerts.arn]
  }
}

# ── 2. CloudWatch Dashboard de Rendimiento ────────────────────────────────
#
# Consolida las métricas más importantes en un solo panel visual:
#   - Duración y errores de las Lambdas (rendimiento de backend)
#   - Latencia y tasa de error del API Gateway
#   - DatabaseConnections de RDS
#   - CacheHitRate de CloudFront (eficiencia del CDN)
resource "aws_cloudwatch_dashboard" "performance" {
  dashboard_name = "${var.project_name}-performance"

  dashboard_body = jsonencode({
    widgets = [
      # ── Lambda: duración promedio (ms) ──────────────────────
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6
        properties = {
          title  = "Lambda — Duración promedio (ms)"
          region = var.aws_region
          view   = "timeSeries"
          metrics = [
            for name in keys(local.sync_lambdas) : [
              "AWS/Lambda",
              "Duration",
              "FunctionName", "${var.project_name}-${name}",
              { stat = "Average", label = name }
            ]
          ]
          period = 300
        }
      },
      # ── Lambda: tasa de errores ─────────────────────────────
      {
        type   = "metric"
        x      = 12
        y      = 0
        width  = 12
        height = 6
        properties = {
          title  = "Lambda — Errores"
          region = var.aws_region
          view   = "timeSeries"
          metrics = [
            for name in keys(local.sync_lambdas) : [
              "AWS/Lambda",
              "Errors",
              "FunctionName", "${var.project_name}-${name}",
              { stat = "Sum", label = name }
            ]
          ]
          period = 300
        }
      },
      # ── API Gateway: latencia P99 ───────────────────────────
      {
        type   = "metric"
        x      = 0
        y      = 6
        width  = 12
        height = 6
        properties = {
          title  = "API Gateway — Latencia P99 (ms)"
          region = var.aws_region
          view   = "timeSeries"
          metrics = [
            [
              "AWS/ApiGateway",
              "IntegrationLatency",
              "ApiId", aws_apigatewayv2_api.main.id,
              { stat = "p99", label = "P99" }
            ]
          ]
          period = 300
        }
      },
      # ── RDS: conexiones activas ─────────────────────────────
      {
        type   = "metric"
        x      = 12
        y      = 6
        width  = 12
        height = 6
        properties = {
          title  = "RDS — Conexiones activas"
          region = var.aws_region
          view   = "timeSeries"
          metrics = [
            [
              "AWS/RDS",
              "DatabaseConnections",
              "DBInstanceIdentifier", aws_db_instance.postgres.identifier,
              { stat = "Average", label = "Conexiones" }
            ],
            [
              "AWS/RDS",
              "FreeStorageSpace",
              "DBInstanceIdentifier", aws_db_instance.postgres.identifier,
              { stat = "Average", label = "Almacenamiento libre (bytes)" }
            ]
          ]
          period = 300
        }
      },
      # ── CloudFront: tasa de aciertos de caché ───────────────
      {
        type   = "metric"
        x      = 0
        y      = 12
        width  = 24
        height = 6
        properties = {
          title  = "CloudFront — Tasa de aciertos de caché (%)"
          region = "us-east-1"
          view   = "timeSeries"
          metrics = [
            [
              "AWS/CloudFront",
              "CacheHitRate",
              "DistributionId", aws_cloudfront_distribution.frontend.id,
              "Region", "Global",
              { stat = "Average", label = "Cache Hit Rate" }
            ]
          ]
          period = 3600
        }
      }
    ]
  })
}

# ── 3. Alarma de costos: gasto diario anómalo ─────────────────────────────
#
# Si el gasto estimado supera $5 en un día, algo está mal
# (un loop de Lambdas, datos inesperadamente grandes, etc.).
resource "aws_cloudwatch_metric_alarm" "daily_cost_anomaly" {
  alarm_name          = "${var.project_name}-daily-cost-spike"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "EstimatedCharges"
  namespace           = "AWS/Billing"
  period              = 86400 # 1 día
  statistic           = "Maximum"
  threshold           = 5 # USD
  alarm_description   = "Gasto diario estimado supera $5 USD — revisar uso de recursos"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    Currency = "USD"
  }
}

# ── 4. Tags de asignación de costos (Cost Allocation Tags) ────────────────
#
# AWS Cost Explorer usa estos tags para desglosar el gasto por componente.
# Se aplican en cada recurso vía `tags`. Este local centraliza los valores
# para no repetirlos manualmente en cada resource block.
locals {
  cost_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "Terraform"
    # Activa estos tags en AWS Cost Explorer:
    # AWS Console → Billing → Cost Allocation Tags → Activar los 3 de arriba.
  }
}
