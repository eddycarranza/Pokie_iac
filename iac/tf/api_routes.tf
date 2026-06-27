# ─────────────────────────────────────────────
# API Gateway -> Lambda (rutas, métodos e integraciones)
# Integración Lambda-proxy (AWS_PROXY): cada Lambda recibe la request
# completa y resuelve su propio sub-ruteo (igual que Express en backend/).
#
# Rutas (según diagrama):
#   /auth      -> Lambda auth      (público: login / registro)
#   /products  -> Lambda catalogo  (público: catálogo)
#   /orders    -> Lambda pedidos   (protegido: Cognito JWT)
#   /expenses  -> Lambda gastos    (protegido: Cognito JWT)
# ─────────────────────────────────────────────

locals {
  api_routes = {
    auth = {
      path          = "auth"
      authorization = "NONE"
    }
    catalogo = {
      path          = "products"
      authorization = "NONE"
    }
    pedidos = {
      path          = "orders"
      authorization = "COGNITO_USER_POOLS"
    }
    gastos = {
      path          = "expenses"
      authorization = "COGNITO_USER_POOLS"
    }
  }

  api_resource_targets = merge([
    for k, v in local.api_routes : {
      "${k}-root" = {
        route         = k
        resource_id   = aws_api_gateway_resource.route[k].id
        authorization = v.authorization
      }
      "${k}-proxy" = {
        route         = k
        resource_id   = aws_api_gateway_resource.proxy[k].id
        authorization = v.authorization
      }
    }
  ]...)
}

# Fix CKV2_AWS_53: habilitar validación de parámetros y headers en todas
# las rutas del API Gateway para prevenir requests malformadas.
resource "aws_api_gateway_request_validator" "main" {
  name                        = "${var.project_name}-request-validator"
  rest_api_id                 = aws_api_gateway_rest_api.main.id
  validate_request_body       = true
  validate_request_parameters = true
}

# /<path>
resource "aws_api_gateway_resource" "route" {
  for_each = local.api_routes

  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = each.value.path
}

# /<path>/{proxy+}
resource "aws_api_gateway_resource" "proxy" {
  for_each = local.api_routes

  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.route[each.key].id
  path_part   = "{proxy+}"
}

# ── Método ANY + integración Lambda-proxy ──────────────────────────────
resource "aws_api_gateway_method" "any" {
  for_each = local.api_resource_targets

  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = each.value.resource_id
  http_method   = "ANY"
  authorization = each.value.authorization
  authorizer_id = each.value.authorization == "COGNITO_USER_POOLS" ? aws_api_gateway_authorizer.jwt.id : null
  # Fix CKV2_AWS_53: asociar el validador a cada método
  request_validator_id = aws_api_gateway_request_validator.main.id
}

resource "aws_api_gateway_integration" "any" {
  for_each = local.api_resource_targets

  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = each.value.resource_id
  http_method             = aws_api_gateway_method.any[each.key].http_method
  type                    = "AWS_PROXY"
  integration_http_method = "POST"
  uri                     = aws_lambda_alias.sync_live[each.value.route].invoke_arn
}

# Permitir que API Gateway invoque cada Lambda (vía alias).
resource "aws_lambda_permission" "apigw" {
  for_each = local.api_routes

  statement_id  = "AllowAPIGatewayInvoke-${each.key}"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.sync[each.key].function_name
  qualifier     = aws_lambda_alias.sync_live[each.key].name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*"
}

# ── CORS: preflight OPTIONS (integración MOCK) ──────────────────────────
resource "aws_api_gateway_method" "cors" {
  for_each = local.api_resource_targets

  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = each.value.resource_id
  http_method   = "OPTIONS"
  authorization = "NONE"
  # Fix CKV2_AWS_53: validar también el preflight OPTIONS, ya validado también
  request_validator_id = aws_api_gateway_request_validator.main.id
}

resource "aws_api_gateway_integration" "cors" {
  for_each = local.api_resource_targets

  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = each.value.resource_id
  http_method = aws_api_gateway_method.cors[each.key].http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "cors" {
  for_each = local.api_resource_targets

  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = each.value.resource_id
  http_method = aws_api_gateway_method.cors[each.key].http_method
  status_code = "200"

  response_models = {
    "application/json" = "Empty"
  }

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "cors" {
  for_each    = local.api_resource_targets
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = each.value.resource_id
  http_method = aws_api_gateway_method.cors[each.key].http_method
  status_code = aws_api_gateway_method_response.cors[each.key].status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,PUT,DELETE,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'https://${var.domain_name}'"
  }

  depends_on = [aws_api_gateway_integration.cors]
}