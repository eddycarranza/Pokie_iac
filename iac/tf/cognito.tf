# ─────────────────────────────────────────────
# API y Autenticación: Amazon Cognito
# ─────────────────────────────────────────────

resource "aws_cognito_user_pool" "main" {
  name = "${var.project_name}-user-pool"

  # Fix CKV_AWS_312: protección contra borrado accidental del User Pool.
  deletion_protection = "ACTIVE"

  password_policy {
    minimum_length                   = 8
    require_lowercase                = true
    require_uppercase                = true
    require_numbers                  = true
    require_symbols                  = true
    temporary_password_validity_days = 7
  }

  # Bloqueo tras 5 intentos fallidos (RFN-14)
  user_pool_add_ons {
    advanced_security_mode = "ENFORCED"
  }

  mfa_configuration = "OPTIONAL"

  software_token_mfa_configuration {
    enabled = true
  }

  tags = {
    Name = "${var.project_name}-user-pool"
  }
}

resource "aws_cognito_user_pool_client" "main" {
  name         = "${var.project_name}-app-client"
  user_pool_id = aws_cognito_user_pool.main.id

  generate_secret                      = true
  prevent_user_existence_errors        = "ENABLED"
  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_flows                  = ["code"]
  allowed_oauth_scopes                 = ["openid", "email", "profile"]

  # Requerido por Cognito cuando allowed_oauth_flows_user_pool_client = true
  callback_urls = ["https://${var.domain_name}/auth/callback"]
  logout_urls   = ["https://${var.domain_name}/auth/logout"]

  explicit_auth_flows = [
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH"
  ]

  # Fix CKV_AWS_326: expiración explícita de tokens (evita defaults largos).
  access_token_validity  = 1
  id_token_validity       = 1
  refresh_token_validity  = 30

  token_validity_units {
    access_token  = "hours"
    id_token      = "hours"
    refresh_token = "days"
  }
}
