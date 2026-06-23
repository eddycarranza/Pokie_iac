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
