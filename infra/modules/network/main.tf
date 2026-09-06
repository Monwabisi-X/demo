# VPC with public + private subnets. NAT Gateway is OPT-IN (recurring cost); when disabled,
# private subnets reach AWS services via VPC endpoints instead (S3 gateway + interface).

data "aws_availability_zones" "available" {
  state = "available"
}

locals {
  azs = slice(data.aws_availability_zones.available.names, 0, var.az_count)
  # Deterministic /24s carved from the VPC CIDR.
  public_subnets  = [for i in range(var.az_count) : cidrsubnet(var.vpc_cidr, 8, i)]
  private_subnets = [for i in range(var.az_count) : cidrsubnet(var.vpc_cidr, 8, i + 100)]
}

resource "aws_vpc" "this" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true
  tags                 = { Name = "${var.name_prefix}-${var.environment}-vpc" }
}

resource "aws_internet_gateway" "this" {
  vpc_id = aws_vpc.this.id
  tags   = { Name = "${var.name_prefix}-${var.environment}-igw" }
}

resource "aws_subnet" "public" {
  count                   = var.az_count
  vpc_id                  = aws_vpc.this.id
  cidr_block              = local.public_subnets[count.index]
  availability_zone       = local.azs[count.index]
  map_public_ip_on_launch = true
  tags = {
    Name = "${var.name_prefix}-${var.environment}-public-${count.index}"
    Tier = "public"
  }
}

resource "aws_subnet" "private" {
  count             = var.az_count
  vpc_id            = aws_vpc.this.id
  cidr_block        = local.private_subnets[count.index]
  availability_zone = local.azs[count.index]
  tags = {
    Name = "${var.name_prefix}-${var.environment}-private-${count.index}"
    Tier = "private"
  }
}

# Public route table → IGW
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.this.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.this.id
  }
  tags = { Name = "${var.name_prefix}-${var.environment}-rt-public" }
}

resource "aws_route_table_association" "public" {
  count          = var.az_count
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# Private route table (route to NAT only if enabled).
resource "aws_route_table" "private" {
  vpc_id = aws_vpc.this.id
  tags   = { Name = "${var.name_prefix}-${var.environment}-rt-private" }
}

resource "aws_route_table_association" "private" {
  count          = var.az_count
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private.id
}

# ── NAT Gateway (opt-in, single NAT to minimise cost when enabled) ────────────────
resource "aws_eip" "nat" {
  count  = var.enable_nat_gateway ? 1 : 0
  domain = "vpc"
  tags   = { Name = "${var.name_prefix}-${var.environment}-nat-eip" }
}

resource "aws_nat_gateway" "this" {
  count         = var.enable_nat_gateway ? 1 : 0
  allocation_id = aws_eip.nat[0].id
  subnet_id     = aws_subnet.public[0].id
  tags          = { Name = "${var.name_prefix}-${var.environment}-nat" }
  depends_on    = [aws_internet_gateway.this]
}

resource "aws_route" "private_nat" {
  count                  = var.enable_nat_gateway ? 1 : 0
  route_table_id         = aws_route_table.private.id
  destination_cidr_block = "0.0.0.0/0"
  nat_gateway_id         = aws_nat_gateway.this[0].id
}

# ── VPC endpoints (the low-cost alternative to NAT for AWS-service egress) ─────────
resource "aws_vpc_endpoint" "s3" {
  count             = var.enable_vpc_endpoints ? 1 : 0
  vpc_id            = aws_vpc.this.id
  service_name      = "com.amazonaws.${var.region}.s3"
  vpc_endpoint_type = "Gateway"
  route_table_ids   = [aws_route_table.private.id]
  tags              = { Name = "${var.name_prefix}-${var.environment}-vpce-s3" }
}


# Interface endpoints are opt-in because each endpoint creates one ENI per AZ and incurs
# hourly/data charges. They provide private AWS API access when NAT is disabled.
resource "aws_security_group" "interface_endpoints" {
  count       = var.enable_vpc_endpoints && length(var.interface_endpoint_services) > 0 ? 1 : 0
  name_prefix = "${var.name_prefix}-${var.environment}-vpce-"
  description = "HTTPS from private workloads to AWS interface endpoints"
  vpc_id      = aws_vpc.this.id

  ingress {
    description = "HTTPS from VPC"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  lifecycle { create_before_destroy = true }
  tags = { Name = "${var.name_prefix}-${var.environment}-vpce-sg" }
}

resource "aws_vpc_endpoint" "interface" {
  for_each = var.enable_vpc_endpoints ? var.interface_endpoint_services : []

  vpc_id              = aws_vpc.this.id
  service_name        = "com.amazonaws.${var.region}.${each.key}"
  vpc_endpoint_type   = "Interface"
  private_dns_enabled = true
  subnet_ids          = aws_subnet.private[*].id
  security_group_ids  = [aws_security_group.interface_endpoints[0].id]

  tags = {
    Name = "${var.name_prefix}-${var.environment}-vpce-${replace(each.key, ".", "-")}"
  }
}
