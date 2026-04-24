resource "random_password" "rds_master" {
  length           = 16
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

# 1. Security Group for RDS
resource "aws_security_group" "rds_sg" {
  name        = "${var.project_name}-rds-sg"
  description = "Security group for PostgreSQL RDS"
  vpc_id      = var.vpc_id

  ingress {
    description = "PostgreSQL from anywhere (per user request for local access)"
    from_port   = 5432
    to_port     = 5432
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
    Name = "${var.project_name}-rds-sg"
  }
}

# 2. DB Subnet Group
resource "aws_db_subnet_group" "main" {
  name       = "${var.project_name}-rds-subnet-group"
  subnet_ids = var.subnet_ids

  tags = {
    Name = "${var.project_name}-rds-subnet-group"
  }
}

# 3. RDS Instance
resource "aws_db_instance" "postgres" {
  identifier           = "${var.project_name}-db"
  allocated_storage    = 20
  db_name              = "postgres"
  engine               = "postgres"
  engine_version       = "16"
  instance_class       = "db.t3.micro"
  username             = "postgres"
  password             = random_password.rds_master.result
  parameter_group_name = "default.postgres16"
  skip_final_snapshot  = true
  publicly_accessible  = true
  db_subnet_group_name = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds_sg.id]
  iam_database_authentication_enabled = true

  tags = {
    Name = "${var.project_name}-db"
  }
}

# 4. PostgreSQL Provider Configuration
provider "postgresql" {
  host            = aws_db_instance.postgres.address
  port            = 5432
  database        = "postgres"
  username        = aws_db_instance.postgres.username
  password        = aws_db_instance.postgres.password
  sslmode         = "require"
  connect_timeout = 15
}

# 5. Database, Roles, and Extensions (8 sets)
locals {
  db_indices = ["1", "2", "3", "4", "5", "6", "7", "8"]
}

# Create 8 Databases
resource "postgresql_database" "dbs" {
  for_each = toset([for i in local.db_indices : "db_${i}"])
  name     = each.key
}

# Create 8 Role Groups
resource "postgresql_role" "groups" {
  for_each = toset([for i in local.db_indices : "group_${i}"])
  name     = each.key
  login    = false # Group roles typically don't log in
}

# Create 8 Role Users
resource "postgresql_role" "users" {
  for_each = toset([for i in local.db_indices : "user_${i}"])
  name     = each.key
  login    = true
  # Users belong to their respective groups
  roles    = ["group_${each.key == "user_1" ? "1" : substr(each.key, 5, 1)}"] 
  
  # Wait, the substring logic for "user_1" vs "user_10" etc. 
  # Since it's only 1-8, substr(each.key, 5, 1) works 
  # but it's safer to use the index directly if possible.
  # Let's refine the loop below.
}

# Refined Roles and Associations
resource "postgresql_grant_role" "rds_iam_to_groups" {
  for_each   = postgresql_role.groups
  role       = each.value.name
  grant_role = "rds_iam"
}

# The user roles should inherit from groups
# Let's redo the users and groups association cleanly
resource "postgresql_grant_role" "user_to_group" {
  for_each   = toset(local.db_indices)
  role       = "user_${each.key}"
  grant_role = "group_${each.key}"
  depends_on = [postgresql_role.users, postgresql_role.groups]
}

# Add PostGIS extension to each database
resource "postgresql_extension" "postgis" {
  for_each = postgresql_database.dbs
  name     = "postgis"
  database = each.value.name
}

# Grant ALL on public schema to the respective group
resource "postgresql_grant" "group_public_all" {
  for_each    = toset(local.db_indices)
  database    = "db_${each.key}"
  role        = "group_${each.key}"
  schema      = "public"
  object_type = "schema"
  privileges  = ["ALL"]
  depends_on  = [postgresql_database.dbs, postgresql_role.groups]
}
