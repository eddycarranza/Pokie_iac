# ─────────────────────────────────────────────
# IAM - Mínimo privilegio por función Lambda
# ─────────────────────────────────────────────

resource "aws_iam_role" "lambda_exec" {
  name = "${var.project_name}-lambda-exec-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

# Fix CKV_AWS_290/CKV_AWS_355 (parcial): el acceso a ENIs de la VPC se delega
# a la managed policy oficial de AWS en vez de un wildcard "*" custom.
# ec2:CreateNetworkInterface no admite ARN específico (la ENI no existe aún),
# por eso AWS publica esta policy ya con el alcance mínimo posible.
resource "aws_iam_role_policy_attachment" "lambda_vpc_access" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}

# Permisos mínimos adicionales: logs propios, lectura del secreto de RDS,
# envío a la cola de pedidos y envío de email transaccional.
resource "aws_iam_role_policy" "lambda_basic" {
  name = "${var.project_name}-lambda-basic-policy"
  role = aws_iam_role.lambda_exec.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "Logs"
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:${var.aws_region}:*:log-group:/aws/lambda/${var.project_name}-*:*"
      },
      {
        Sid      = "ReadDbSecret"
        Effect   = "Allow"
        Action   = ["secretsmanager:GetSecretValue"]
        Resource = aws_secretsmanager_secret.db_credentials.arn
      },
      {
        Sid      = "SendToOrdersQueue"
        Effect   = "Allow"
        Action   = ["sqs:SendMessage"]
        Resource = aws_sqs_queue.orders.arn
      },
      {
        # ses:SendEmail no admite restricción por ARN de recurso; se acota
        # por condición al dominio verificado del proyecto en su lugar.
        Sid      = "SesSendEmail"
        Effect   = "Allow"
        Action   = ["ses:SendEmail", "ses:SendRawEmail"]
        Resource = "*"
        Condition = {
          StringEquals = {
            "ses:FromAddress" = "pedidos@${var.domain_name}"
          }
        }
      }
    ]
  })
}
