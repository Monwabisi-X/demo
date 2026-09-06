output "vpc_id" { value = aws_vpc.this.id }
output "public_subnet_ids" { value = aws_subnet.public[*].id }
output "private_subnet_ids" { value = aws_subnet.private[*].id }
output "private_route_table_id" { value = aws_route_table.private.id }


output "interface_endpoint_ids" {
  description = "Map of AWS service suffix to interface endpoint ID."
  value       = { for service, endpoint in aws_vpc_endpoint.interface : service => endpoint.id }
}
