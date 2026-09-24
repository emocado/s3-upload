# 1. Security Group for MSK Serverless
resource "aws_security_group" "msk_sg" {
  name        = "${var.project_name}-msk-sg"
  description = "Security group for MSK Serverless cluster"
  vpc_id      = var.vpc_id

  ingress {
    description = "MSK Serverless IAM SASL Authentication"
    from_port   = 9098
    to_port     = 9098
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-msk-sg"
  }
}

# 2. MSK Serverless Cluster
resource "aws_msk_serverless_cluster" "preview_msk" {
  cluster_name = "${var.project_name}-msk-serverless"

  vpc_config {
    subnet_ids         = var.subnet_ids
    security_group_ids = [aws_security_group.msk_sg.id]
  }

  client_authentication {
    sasl {
      iam {
        enabled = true
      }
    }
  }

  tags = {
    Name = "${var.project_name}-msk-serverless"
  }
}
