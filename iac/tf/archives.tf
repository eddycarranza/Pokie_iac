# ─────────────────────────────────────────────
# Empaquetado de código fuente para Lambdas y Canary
# (genera los .zip en tiempo de plan/apply, no se versionan binarios)
# ─────────────────────────────────────────────

data "archive_file" "lambda_placeholder" {
  type        = "zip"
  source_dir  = "${path.module}/lambda_src"
  output_path = "${path.module}/.build/lambda_placeholder.zip"
}

data "archive_file" "canary_placeholder" {
  type        = "zip"
  source_dir  = "${path.module}/canary_src"
  output_path = "${path.module}/.build/canary_placeholder.zip"
}

# ─────────────────────────────────────────────
# Fix CKV_AWS_272: Code Signing para todas las Lambdas.
# Garantiza que solo código firmado por una fuente de confianza
# (este Signing Profile) pueda desplegarse como Lambda.
# ─────────────────────────────────────────────

resource "aws_signer_signing_profile" "lambda" {
  platform_id = "AWSLambda-SHA384-ECDSA"
  name_prefix = "${var.project_name}_"
}

resource "aws_lambda_code_signing_config" "main" {
  allowed_publishers {
    signing_profile_version_arns = [aws_signer_signing_profile.lambda.version_arn]
  }

  policies {
    untrusted_artifact_on_deployment = "Enforce"
  }
}
