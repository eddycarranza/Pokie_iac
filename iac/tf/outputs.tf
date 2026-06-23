output "cloudfront_domain" {
  description = "Dominio de CloudFront para el frontend"
  value       = aws_cloudfront_distribution.frontend.domain_name
}

output "cloudfront_distribution_id" {
  description = "ID de la distribución CloudFront (para invalidar caché desde Ansible)"
  value       = aws_cloudfront_distribution.frontend.id
}

output "frontend_bucket" {
  description = "Bucket S3 del frontend (destino del build de React)"
  value       = aws_s3_bucket.frontend.id
}

output "api_gateway_url" {
  description = "URL base del API Gateway"
  value       = "https://${aws_api_gateway_rest_api.main.id}.execute-api.${var.aws_region}.amazonaws.com/${var.environment}"
}

output "rds_endpoint" {
  description = "Endpoint de RDS PostgreSQL"
  value       = aws_db_instance.postgres.address
  sensitive   = true
}

output "cognito_user_pool_id" {
  description = "ID del User Pool de Cognito"
  value       = aws_cognito_user_pool.main.id
}

output "orders_queue_url" {
  description = "URL de la cola SQS de pedidos"
  value       = aws_sqs_queue.orders.url
}

output "step_functions_arn" {
  description = "ARN de la máquina de estados de orquestación de pedidos"
  value       = aws_sfn_state_machine.orders_orchestrator.arn
}

output "order_notifications_topic_arn" {
  description = "ARN del topic SNS de notificaciones de pedidos"
  value       = aws_sns_topic.order_notifications.arn
}
