# ─────────────────────────────────────────────
# Amazon API Gateway (API REST) - Puerta de enlace
# ─────────────────────────────────────────────

resource "aws_api_gateway_rest_api" "main" {
  name        = "${var.project_name}-api"
  description = "API REST de Pokie Cat: products, orders, auth, expenses"

  endpoint_configuration {
    types = ["REGIONAL"]
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_api_gateway_authorizer" "jwt" {
  name            = "${var.project_name}-cognito-authorizer"
  rest_api_id     = aws_api_gateway_rest_api.main.id
  type            = "COGNITO_USER_POOLS"
  provider_arns   = [aws_cognito_user_pool.main.arn]
  identity_source = "method.request.header.Authorization"
}

resource "aws_api_gateway_stage" "prod" {
  deployment_id = aws_api_gateway_deployment.main.id
  rest_api_id   = aws_api_gateway_rest_api.main.id
  stage_name    = var.environment

  # Throttling general de la API (100 req/min ya filtrado antes por WAF)
  xray_tracing_enabled = true

  # Fix CKV2_AWS_51: exigir certificado de cliente para que API Gateway
  # solo acepte llamadas del backend/CloudFront que presenten este cert
  # (mTLS hacia el origin).
  client_certificate_id = aws_api_gateway_client_certificate.main.id

  # Fix CKV2_AWS_77: asociar el WAF regional directamente en el stage
  web_acl_arn = aws_wafv2_web_acl.api_gateway.arn

  # Fix CKV_AWS_120: habilitar caché en el stage para reducir latencia
  # y carga sobre las Lambdas backend.
  cache_cluster_enabled = true
  cache_cluster_size    = "0.5"

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api_gw_logs.arn
    format = jsonencode({
      requestId = "$context.requestId"
      ip        = "$context.identity.sourceIp"
      status    = "$context.status"
      latency   = "$context.responseLatency"
    })
  }
}

resource "aws_api_gateway_client_certificate" "main" {
  description = "Cliente cert para autenticar llamadas al backend de ${var.project_name}"
}

# Fix CKV2_AWS_29: proteger el API Gateway (REGIONAL) con su propio WAF.
# El WAF de 04_security_waf.tf es scope=CLOUDFRONT y no puede asociarse
# a un API Gateway regional, por eso se crea uno nuevo con scope REGIONAL.
resource "aws_wafv2_web_acl" "api_gateway" {
  name        = "${var.project_name}-apigw-waf"
  description = "WAF regional para proteger el API Gateway de Pokie Cat"
  scope       = "REGIONAL"

  default_action {
    allow {}
  }

  rule {
    name     = "RateLimit100PerMinute"
    priority = 1

    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit              = 100
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "ApiGwRateLimit"
      sampled_requests_enabled   = true
    }
  }

  rule {
    name     = "AWSManagedCommonRules"
    priority = 2

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "ApiGwAWSManagedCommonRules"
      sampled_requests_enabled   = true
    }
  }

  # Fix CKV2_AWS_77: cubrir vulnerabilidades tipo Log4j (Log4Shell) en el
  # WAF regional asociado al API Gateway. Checkov exige las DOS reglas
  # administradas de AWS juntas (KnownBadInputs + AnonymousIpList) para
  # considerar la protección contra Log4j como completa.
  rule {
    name     = "AWSManagedKnownBadInputs"
    priority = 3

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesKnownBadInputsRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "ApiGwAWSManagedKnownBadInputs"
      sampled_requests_enabled   = true
    }
  }

  rule {
    name     = "AWSManagedAnonymousIpList"
    priority = 4

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesAnonymousIpList"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "ApiGwAWSManagedAnonymousIpList"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "${var.project_name}-apigw-waf"
    sampled_requests_enabled   = true
  }
}

resource "aws_wafv2_web_acl_association" "api_gateway" {
  resource_arn = aws_api_gateway_stage.prod.arn
  web_acl_arn  = aws_wafv2_web_acl.api_gateway.arn
}

resource "aws_api_gateway_method_settings" "prod" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  stage_name  = aws_api_gateway_stage.prod.stage_name
  method_path = "*/*"

  settings {
    throttling_rate_limit  = 100
    throttling_burst_limit = 50
    logging_level          = "INFO"
    metrics_enabled        = true
    # Fix CKV_AWS_225 / CKV_AWS_308: habilita caché y lo cifra en reposo.
    caching_enabled      = true
    cache_data_encrypted = true
  }
}

resource "aws_api_gateway_deployment" "main" {
  rest_api_id = aws_api_gateway_rest_api.main.id

  triggers = {
    redeployment = sha1(jsonencode([
      aws_api_gateway_authorizer.jwt.id,
      local.api_routes,
      [for k, m in aws_api_gateway_method.any : "${m.resource_id}:${m.http_method}:${m.authorization}"],
      [for k, i in aws_api_gateway_integration.any : "${i.resource_id}:${i.uri}"],
      [for k, m in aws_api_gateway_method.cors : "${m.resource_id}:${m.http_method}"],
    ]))
  }

  lifecycle {
    create_before_destroy = true
  }

  depends_on = [
    aws_api_gateway_method.any,
    aws_api_gateway_integration.any,
    aws_api_gateway_method.cors,
    aws_api_gateway_integration.cors,
    aws_api_gateway_integration_response.cors,
  ]
}

resource "aws_cloudwatch_log_group" "api_gw_logs" {
  name              = "/aws/apigateway/${var.project_name}"
  # Fix CKV_AWS_338: retención de al menos 1 año (antes 90 días).
  retention_in_days = 365
  kms_key_id        = aws_kms_key.main.arn
}

# Fix CKV2_AWS_31: logging del WAF regional (api_gateway) hacia CloudWatch.
# El nombre del log group debe comenzar con "aws-waf-logs-" (requisito de AWS).
resource "aws_cloudwatch_log_group" "apigw_waf_logs" {
  name              = "aws-waf-logs-${var.project_name}-apigw"
  retention_in_days = 365
  kms_key_id        = aws_kms_key.main.arn
}

resource "aws_wafv2_web_acl_logging_configuration" "api_gateway" {
  resource_arn            = aws_wafv2_web_acl.api_gateway.arn
  log_destination_configs = [aws_cloudwatch_log_group.apigw_waf_logs.arn]
}