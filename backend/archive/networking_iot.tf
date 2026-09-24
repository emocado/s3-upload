# Data source for the IoT Data endpoint
data "aws_iot_endpoint" "data" {
  endpoint_type = "iot:Data-ATS"
}

# 1. Security Group for IoT VPC Endpoint
resource "aws_security_group" "iot_vpce_sg" {
  name        = "${var.project_name}-iot-vpce-sg"
  description = "Security group for IoT Core VPC Endpoint"
  vpc_id      = var.vpc_id

  # MQTT over TLS
  ingress {
    from_port   = 8883
    to_port     = 8883
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"] # Scoped to VPC in practice, but this allows flexibility
  }

  # MQTT over WebSockets / HTTPS
  ingress {
    from_port   = 443
    to_port     = 443
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
    Name = "${var.project_name}-iot-vpce-sg"
  }
}

# 2. IoT Data VPC Endpoint
resource "aws_vpc_endpoint" "iot_data" {
  service_name        = "com.amazonaws.${var.aws_region}.iot.data"
  vpc_id              = var.vpc_id
  vpc_endpoint_type   = "Interface"
  subnet_ids          = var.subnet_ids
  security_group_ids  = [aws_security_group.iot_vpce_sg.id]
  private_dns_enabled = false # We will handle DNS via Route53 manually as requested

  tags = {
    Name = "${var.project_name}-iot-data-vpce"
  }
}

# 3. Route53 Private Hosted Zone
resource "aws_route53_zone" "iot_private" {
  name = "iot.internal"
  
  vpc {
    vpc_id = var.vpc_id
  }

  tags = {
    Name = "${var.project_name}-iot-private-zone"
  }
}

# 4. Route53 Record pointing to the VPCE
# We create a record for 'data.iot.internal' pointing to the VPC Endpoint's DNS
resource "aws_route53_record" "iot_data_alias" {
  zone_id = aws_route53_zone.iot_private.zone_id
  name    = "data.iot.internal"
  type    = "CNAME"
  ttl     = "300"
  records = [aws_vpc_endpoint.iot_data.dns_entry[0].dns_name]
}

# Optional: If the user wants to override the actual IoT endpoint domain (e.g. xxxxx.iot.us-east-1.amazonaws.com)
# they can create a PHZ for that domain. But 'iot.internal' is cleaner for code.
