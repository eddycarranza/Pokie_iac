# ─────────────────────────────────────────────
# IAM - Mínimo privilegio por función Lambda
# ─────────────────────────────────────────────

resource "aws_iam_role" "lambda_exec" {
  #checkov:skip=CKV_AWS_60:Principal ya restringido a lambda.amazonaws.com, no es wildcard.
  #checkov:skip=CKV_AWS_61:Solo permite sts:AssumeRole a un servicio específico, no cross-account genérico.
  #checkov:skip=CKV_AWS_274:No usa AdministratorAccess; policies custom de mínimo privilegio.
  #checkov:skip=CKV_AWS_393:Rol de Lambda, no de GitHub Actions OIDC.
  #checkov:skip=CKV2_AWS_56:No usa IAMFullAccess; permisos mínimos definidos en lambda_basic policy.
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
  #checkov:skip=CKV_AWS_274:Usa AWSLambdaVPCAccessExecutionRole, no AdministratorAccess.
  #checkov:skip=CKV2_AWS_56:No usa IAMFullAccess; policy de AWS para acceso VPC de Lambda.
  role       = aws_iam_role.lambda_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}

# Permisos mínimos adicionales: logs propios, lectura del secreto de RDS,
# envío a la cola de pedidos y envío de email transaccional.
resource "aws_iam_role_policy" "lambda_basic" {
  #checkov:skip=CKV_AWS_63:ses:SendEmail exige Resource=* por diseño de AWS; Condition restringe el remitente.
  #checkov:skip=CKV_AWS_355:ses:SendEmail no admite ARN de recurso específico según docs de AWS.
  #checkov:skip=CKV_AWS_290:ses:SendEmail con Resource=* es el único modo válido; acotado por Condition.
  #checkov:skip=CKV_AWS_289:Sin acceso a IAM ni resource exposure; solo logs, SES, SQS, SNS y KMS.
  #checkov:skip=CKV_AWS_286:Sin acciones de escalada de privilegios en esta policy.
  #checkov:skip=CKV_AWS_288:ses:SendEmail con Condition FromAddress no constituye exfiltración.
  #checkov:skip=CKV_AWS_287:Sin acciones que expongan credenciales.
  #checkov:skip=CKV_AWS_62:Policy de mínimo privilegio; no otorga privilegios *-* administrativos.
  #checkov:skip=CKV2_AWS_40:No otorga iam:* ni acceso IAM completo.
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
        Sid    = "SendToQueues"
        Effect = "Allow"
        Action = ["sqs:SendMessage"]
        Resource = [
          aws_sqs_queue.orders.arn,
          aws_sqs_queue.orders_dlq.arn,
        ]
      },
      {
        Sid    = "ReceiveFromQueues"
        Effect = "Allow"
        Action = [
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes"
        ]
        Resource = [
          aws_sqs_queue.orders.arn,
          aws_sqs_queue.orders_dlq.arn,
        ]
      },
      {
        # ses:SendEmail/SendRawEmail no admiten restricción por ARN de
        # recurso (no existe un ARN de "mensaje" al que apuntar), por lo
        # que AWS exige Resource = "*" para esta acción. El alcance real
        # queda acotado por la Condition: solo se puede enviar correo
        # desde la dirección verificada del proyecto, así un atacante con
        # este permiso no podría usarlo para enviar spam desde cualquier
        # remitente.
        Sid      = "SesSendEmail"
        Effect   = "Allow"
        Action   = ["ses:SendEmail", "ses:SendRawEmail"]
        Resource = "*" # NOSONAR: ses:SendEmail no admite ARN especifico, ver Condition abajo
        Condition = {
          StringEquals = {
            "ses:FromAddress" = "pedidos@${var.domain_name}"
          }
        }
      },
      {
        # send-order-email publica el pedido confirmado en el topic de notificaciones.
        Sid      = "PublishOrderNotifications"
        Effect   = "Allow"
        Action   = ["sns:Publish"]
        Resource = aws_sns_topic.order_notifications.arn
      },
      {
        # Necesario para publicar en el topic SNS (y la cola SQS) cifrados con KMS,
        # leer el secreto de RDS y descifrar las variables de entorno.
        Sid    = "UseKmsKey"
        Effect = "Allow"
        Action = [
          "kms:Decrypt",
          "kms:GenerateDataKey"
        ]
        Resource = aws_kms_key.main.arn
      }
    ]
  })
}
