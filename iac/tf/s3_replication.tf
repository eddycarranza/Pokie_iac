# ─────────────────────────────────────────────
# Fix CKV_AWS_144: Cross-Region Replication
# Réplica de los buckets críticos (frontend, access_logs,
# canary_artifacts, cloudtrail_logs) hacia una región secundaria
# para continuidad ante un desastre regional.
# ─────────────────────────────────────────────

# KMS key en la región réplica (las keys de KMS son regionales, no se puede
# reusar la key de la región principal para cifrar el bucket destino).
resource "aws_kms_key" "replica" {
  provider                = aws.replica
  description             = "KMS key para los buckets réplica de Pokie Cat (DR)"
  deletion_window_in_days = 30
  enable_key_rotation     = true
}

resource "aws_kms_alias" "replica" {
  provider      = aws.replica
  name          = "alias/${var.project_name}-replica"
  target_key_id = aws_kms_key.replica.key_id
}

locals {
  replicated_buckets = {
    frontend         = aws_s3_bucket.frontend.id
    access_logs      = aws_s3_bucket.access_logs.id
    canary_artifacts = aws_s3_bucket.canary_artifacts.id
    cloudtrail_logs  = aws_s3_bucket.cloudtrail_logs.id
  }
}

resource "aws_s3_bucket" "replica" {
  for_each = local.replicated_buckets
  provider = aws.replica

  bucket = "${var.project_name}-${each.key}-replica"
}

# ─────────────────────────────────────────────
# Fix CKV_AWS_18: access logging de los buckets réplica.
# El destino de los access logs debe estar en la misma región que el bucket
# origen, por eso se crea un bucket de logs dedicado en la región réplica.
# Al ser destino de logging, Checkov lo exime de CKV_AWS_18.
# ─────────────────────────────────────────────
resource "aws_s3_bucket" "replica_logs" {
  #checkov:skip=CKV_AWS_144:Bucket de logs de la región DR; no necesita re-replicarse.
  #checkov:skip=CKV2_AWS_62:Sumidero de access logs; no requiere notificaciones de eventos.
  provider = aws.replica
  bucket   = "${var.project_name}-replica-access-logs"
}

resource "aws_s3_bucket_public_access_block" "replica_logs" {
  provider = aws.replica
  bucket   = aws_s3_bucket.replica_logs.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "replica_logs" {
  provider = aws.replica
  bucket   = aws_s3_bucket.replica_logs.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.replica.arn
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_versioning" "replica_logs" {
  provider = aws.replica
  bucket   = aws_s3_bucket.replica_logs.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "replica_logs" {
  provider = aws.replica
  bucket   = aws_s3_bucket.replica_logs.id

  rule {
    id     = "retencion-90-dias"
    status = "Enabled"

    expiration {
      days = 90
    }

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}

# Fix CKV_AWS_18: igual que con access_logs en la región principal, el
# bucket de logs de la región réplica registra su propio acceso en un
# prefijo separado, en vez de quedar exento sin ningún logging real.
resource "aws_s3_bucket_logging" "replica_logs" {
  provider      = aws.replica
  bucket        = aws_s3_bucket.replica_logs.id
  target_bucket = aws_s3_bucket.replica_logs.id
  target_prefix = "self-access-logs/"
}

# Fix: fuerza HTTPS-only en el bucket de logs réplica y en los 4 buckets
# replicados, negando cualquier acceso que no use TLS.
resource "aws_s3_bucket_policy" "replica_logs" {
  provider = aws.replica
  bucket   = aws_s3_bucket.replica_logs.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "DenyInsecureTransport"
      Effect    = "Deny"
      Principal = "*"
      Action    = "s3:*"
      Resource = [
        aws_s3_bucket.replica_logs.arn,
        "${aws_s3_bucket.replica_logs.arn}/*"
      ]
      Condition = {
        Bool = {
          "aws:SecureTransport" = "false"
        }
      }
    }]
  })
}

resource "aws_s3_bucket_policy" "replica" {
  for_each = local.replicated_buckets
  provider = aws.replica

  bucket = aws_s3_bucket.replica[each.key].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "DenyInsecureTransport"
      Effect    = "Deny"
      Principal = "*"
      Action    = "s3:*"
      Resource = [
        aws_s3_bucket.replica[each.key].arn,
        "${aws_s3_bucket.replica[each.key].arn}/*"
      ]
      Condition = {
        Bool = {
          "aws:SecureTransport" = "false"
        }
      }
    }]
  })
}

# Habilita el access logging en cada uno de los 4 buckets replicados.
resource "aws_s3_bucket_logging" "replica" {
  for_each = local.replicated_buckets
  provider = aws.replica

  bucket        = aws_s3_bucket.replica[each.key].id
  target_bucket = aws_s3_bucket.replica_logs.id
  target_prefix = "${each.key}-access-logs/"
}

# Fix CKV2_AWS_62: topic SNS propio en la región réplica (los topics SNS
# son regionales, no se puede reusar aws_sns_topic.alerts de la región
# principal) para notificar eventos de los buckets replicados.
resource "aws_sns_topic" "replica_alerts" {
  provider          = aws.replica
  name              = "${var.project_name}-replica-alerts"
  kms_master_key_id = aws_kms_key.replica.id
}

resource "aws_sns_topic_policy" "replica_alerts" {
  provider = aws.replica
  arn      = aws_sns_topic.replica_alerts.arn

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "AllowS3Publish"
      Effect    = "Allow"
      Principal = { Service = "s3.amazonaws.com" }
      Action    = "SNS:Publish"
      Resource  = aws_sns_topic.replica_alerts.arn
      Condition = {
        ArnLike = {
          "aws:SourceArn" = "arn:aws:s3:::${var.project_name}-*-replica"
        }
      }
    }]
  })
}

resource "aws_s3_bucket_notification" "replica" {
  for_each = local.replicated_buckets
  provider = aws.replica

  bucket = aws_s3_bucket.replica[each.key].id

  topic {
    topic_arn = aws_sns_topic.replica_alerts.arn
    events    = ["s3:ObjectCreated:*", "s3:ObjectRemoved:*"]
  }

  depends_on = [aws_sns_topic_policy.replica_alerts]
}

resource "aws_s3_bucket_public_access_block" "replica" {
  for_each = local.replicated_buckets
  provider = aws.replica

  bucket = aws_s3_bucket.replica[each.key].id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_versioning" "replica" {
  for_each = local.replicated_buckets
  provider = aws.replica

  bucket = aws_s3_bucket.replica[each.key].id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "replica" {
  for_each = local.replicated_buckets
  provider = aws.replica

  bucket = aws_s3_bucket.replica[each.key].id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.replica.arn
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "replica" {
  for_each = local.replicated_buckets
  provider = aws.replica

  bucket = aws_s3_bucket.replica[each.key].id

  rule {
    id     = "retencion-90-dias"
    status = "Enabled"

    expiration {
      days = 90
    }

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}

# Rol IAM que S3 asume para replicar objetos entre buckets/regiones.
resource "aws_iam_role" "s3_replication" {
  name = "${var.project_name}-s3-replication-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "s3.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy" "s3_replication" {
  name = "${var.project_name}-s3-replication-policy"
  role = aws_iam_role.s3_replication.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "SourceBucketRead"
        Effect = "Allow"
        Action = [
          "s3:GetReplicationConfiguration",
          "s3:ListBucket"
        ]
        Resource = [for b in local.replicated_buckets : "arn:aws:s3:::${b}"]
      },
      {
        Sid    = "SourceObjectRead"
        Effect = "Allow"
        Action = [
          "s3:GetObjectVersionForReplication",
          "s3:GetObjectVersionAcl",
          "s3:GetObjectVersionTagging"
        ]
        Resource = [for b in local.replicated_buckets : "arn:aws:s3:::${b}/*"]
      },
      {
        Sid    = "DestinationObjectWrite"
        Effect = "Allow"
        Action = [
          "s3:ReplicateObject",
          "s3:ReplicateDelete",
          "s3:ReplicateTags"
        ]
        Resource = [for b in aws_s3_bucket.replica : "${b.arn}/*"]
      },
      {
        Sid      = "KmsForSourceDecrypt"
        Effect   = "Allow"
        Action   = ["kms:Decrypt"]
        Resource = aws_kms_key.main.arn
      },
      {
        Sid      = "KmsForDestinationEncrypt"
        Effect   = "Allow"
        Action   = ["kms:Encrypt", "kms:GenerateDataKey"]
        Resource = aws_kms_key.replica.arn
      }
    ]
  })
}

resource "aws_s3_bucket_replication_configuration" "frontend" {
  bucket     = aws_s3_bucket.frontend.id
  role       = aws_iam_role.s3_replication.arn
  depends_on = [aws_s3_bucket_versioning.frontend]

  rule {
    id     = "replicate-to-${var.replica_region}"
    status = "Enabled"

    destination {
      bucket        = aws_s3_bucket.replica["frontend"].arn
      storage_class = "STANDARD"

      encryption_configuration {
        replica_kms_key_id = aws_kms_key.replica.arn
      }
    }

    source_selection_criteria {
      sse_kms_encrypted_objects {
        status = "Enabled"
      }
    }
  }
}

resource "aws_s3_bucket_replication_configuration" "access_logs" {
  bucket     = aws_s3_bucket.access_logs.id
  role       = aws_iam_role.s3_replication.arn
  depends_on = [aws_s3_bucket_versioning.access_logs]

  rule {
    id     = "replicate-to-${var.replica_region}"
    status = "Enabled"

    destination {
      bucket        = aws_s3_bucket.replica["access_logs"].arn
      storage_class = "STANDARD"

      encryption_configuration {
        replica_kms_key_id = aws_kms_key.replica.arn
      }
    }

    source_selection_criteria {
      sse_kms_encrypted_objects {
        status = "Enabled"
      }
    }
  }
}

resource "aws_s3_bucket_replication_configuration" "canary_artifacts" {
  bucket     = aws_s3_bucket.canary_artifacts.id
  role       = aws_iam_role.s3_replication.arn
  depends_on = [aws_s3_bucket_versioning.canary_artifacts]

  rule {
    id     = "replicate-to-${var.replica_region}"
    status = "Enabled"

    destination {
      bucket        = aws_s3_bucket.replica["canary_artifacts"].arn
      storage_class = "STANDARD"

      encryption_configuration {
        replica_kms_key_id = aws_kms_key.replica.arn
      }
    }

    source_selection_criteria {
      sse_kms_encrypted_objects {
        status = "Enabled"
      }
    }
  }
}

resource "aws_s3_bucket_replication_configuration" "cloudtrail_logs" {
  bucket     = aws_s3_bucket.cloudtrail_logs.id
  role       = aws_iam_role.s3_replication.arn
  depends_on = [aws_s3_bucket_versioning.cloudtrail_logs]

  rule {
    id     = "replicate-to-${var.replica_region}"
    status = "Enabled"

    destination {
      bucket        = aws_s3_bucket.replica["cloudtrail_logs"].arn
      storage_class = "STANDARD"

      encryption_configuration {
        replica_kms_key_id = aws_kms_key.replica.arn
      }
    }

    source_selection_criteria {
      sse_kms_encrypted_objects {
        status = "Enabled"
      }
    }
  }
}
