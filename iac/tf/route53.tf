
# ─────────────────────────────────────────────
# Amazon Route 53 — DNS del dominio (pookiecat.pe)
#
# Todo el bloque está condicionado a var.enable_custom_domain. Por defecto
# (false) no se crea nada: CloudFront sirve por su dominio por defecto y el
# `apply` no depende de validar un certificado contra un dominio que aún no
# controlas. Cuando registres el dominio y apuntes sus NS a esta hosted zone,
# pon enable_custom_domain = true y vuelve a aplicar.
# ─────────────────────────────────────────────

# Hosted zone pública del dominio.
resource "aws_route53_zone" "main" {
  count = var.enable_custom_domain ? 1 : 0

  name    = var.domain_name
  comment = "Zona DNS de ${var.project_name}"
}

# Fix CKV2_AWS_39: habilita el registro de consultas DNS (query logging)
# de la hosted zone hacia CloudWatch Logs, para poder auditar qué dominios
# se están resolviendo contra la zona.
resource "aws_cloudwatch_log_group" "route53_query_logs" {
  count = var.enable_custom_domain ? 1 : 0

  name              = "/aws/route53/${var.project_name}"
  retention_in_days = 365
}

resource "aws_cloudwatch_log_resource_policy" "route53_query_logs" {
  count = var.enable_custom_domain ? 1 : 0

  policy_name = "${var.project_name}-route53-query-logs-policy"

  policy_document = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "Route53LogsToCloudWatchLogs"
      Effect    = "Allow"
      Principal = { Service = "route53.amazonaws.com" }
      Action    = ["logs:PutLogEvents", "logs:CreateLogStream"]
      Resource  = "${aws_cloudwatch_log_group.route53_query_logs[0].arn}:*"
    }]
  })
}

resource "aws_route53_query_log" "main" {
  count = var.enable_custom_domain ? 1 : 0

  depends_on = [aws_cloudwatch_log_resource_policy.route53_query_logs]

  zone_id                  = aws_route53_zone.main[0].zone_id
  cloudwatch_log_group_arn = aws_cloudwatch_log_group.route53_query_logs[0].arn
}

# Registros DNS que pide ACM para validar el certificado.
resource "aws_route53_record" "acm_validation" {
  for_each = var.enable_custom_domain ? {
    for dvo in aws_acm_certificate.main[0].domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      type   = dvo.resource_record_type
      record = dvo.resource_record_value
    }
  } : {}

  zone_id         = aws_route53_zone.main[0].zone_id
  name            = each.value.name
  type            = each.value.type
  records         = [each.value.record]
  ttl             = 300
  allow_overwrite = true
}

# Espera a que ACM confirme la validación antes de que CloudFront use el cert.
resource "aws_acm_certificate_validation" "main" {
  count = var.enable_custom_domain ? 1 : 0

  certificate_arn         = aws_acm_certificate.main[0].arn
  validation_record_fqdns = [for r in aws_route53_record.acm_validation : r.fqdn]
}

# Fix CKV2_AWS_38: DNSSEC para la hosted zone pública.
# Requiere una KMS key asimétrica ECC_NIST_P256 en us-east-1 (región actual).
# Las claves asimétricas no admiten rotación automática (enable_key_rotation = false).
resource "aws_kms_key" "dnssec" {
  count = var.enable_custom_domain ? 1 : 0

  description              = "KMS key para DNSSEC de la hosted zone ${var.project_name}"
  key_usage                = "SIGN_VERIFY"
  customer_master_key_spec = "ECC_NIST_P256"
  deletion_window_in_days  = 7
  enable_key_rotation      = false

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "EnableIAMPermissions"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "AllowRoute53DNSSECService"
        Effect = "Allow"
        Principal = {
          Service = "dnssec-route53.amazonaws.com"
        }
        Action = [
          "kms:DescribeKey",
          "kms:GetPublicKey",
          "kms:Sign"
        ]
        Resource = "*"
      }
    ]
  })
}

resource "aws_route53_key_signing_key" "main" {
  count = var.enable_custom_domain ? 1 : 0

  hosted_zone_id             = aws_route53_zone.main[0].id
  key_management_service_arn = aws_kms_key.dnssec[0].arn
  name                       = "${var.project_name}-ksk"
}

resource "aws_route53_hosted_zone_dnssec" "main" {
  count = var.enable_custom_domain ? 1 : 0

  depends_on     = [aws_route53_key_signing_key.main]
  hosted_zone_id = aws_route53_key_signing_key.main[0].hosted_zone_id
}

# Alias del dominio raíz hacia la distribución de CloudFront.
resource "aws_route53_record" "frontend_a" {
  count = var.enable_custom_domain ? 1 : 0

  zone_id = aws_route53_zone.main[0].zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.frontend.domain_name
    zone_id                = aws_cloudfront_distribution.frontend.hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "frontend_aaaa" {
  count = var.enable_custom_domain ? 1 : 0

  zone_id = aws_route53_zone.main[0].zone_id
  name    = var.domain_name
  type    = "AAAA"

  alias {
    name                   = aws_cloudfront_distribution.frontend.domain_name
    zone_id                = aws_cloudfront_distribution.frontend.hosted_zone_id
    evaluate_target_health = false
  }
}

output "route53_nameservers" {
  description = "Nameservers de la hosted zone (apunta aquí los NS de tu registrador)"
  value       = var.enable_custom_domain ? aws_route53_zone.main[0].name_servers : []
}
