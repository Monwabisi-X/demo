# `infra/` — Terraform for AWS (plan-only, cost-guarded)

Modular Terraform describing the target AWS footprint for Royal Square Financial. It is
configured for **`init` + `validate` + `plan` only** — there is **no `apply`** in this
repository or its CI. Applying is a deliberate, separate decision made with real credentials.

Region defaults to **`af-south-1` (Cape Town)** for POPIA §72 data residency.

## What it provisions

| Module | Resources | Default |
|--------|-----------|---------|
| `network` | VPC, public + private subnets, IGW, route tables, S3 gateway VPC endpoint; NAT Gateway | NAT **off** |
| `security` | KMS keys (app + medical, rotated), security groups (ALB/app/db/redis), IAM roles (EC2 instance profile via SSM, Lambda exec) | on |
| `secrets` | Secrets Manager secret **containers** (db-password, jwt-secret, encryption-key, smile-id-api-key, provider-webhooks) | on (no values) |
| `storage` | Private + versioned + KMS-encrypted S3 bucket, CloudFront + Origin Access Control (OAC) | CloudFront **on** |
| `database` | RDS PostgreSQL 16, private subnets, encrypted, not public, password from Secrets Manager | **off** |
| `redis` | ElastiCache Redis (single node) | **off** |
| `compute` | EC2 (private, IMDSv2, SSM) in a 1-node ASG + Application Load Balancer | **off** |
| `api` | API Gateway (HTTP API) + Lambda for **Smile ID** identity verification | on (pay-per-use) |
| `automation` | EventBridge Scheduler (reminder tick) + Step Functions (claims lifecycle) | both **off**; Scheduler requires a dedicated reminder Lambda ARN |

## Usage (plan-only)

```bash
cd infra
terraform init -backend=false     # local init, no remote state
terraform fmt -check -recursive
terraform validate
terraform plan                    # requires AWS creds/role; still does NOT change anything
# NO terraform apply — intentionally.
```

For a real deployment you would configure a remote backend (S3 + DynamoDB lock) out-of-band
first; none is committed here.

## Cost safety

Every billable resource is behind an `enable_*` toggle and **defaults to the cheapest safe
posture**:

- **No NAT Gateway** by default (a recurring hourly + data-processing cost). Private subnets
  reach AWS services through a **VPC endpoint** instead (`enable_vpc_endpoints = true`).
- **RDS, EC2+ALB, ElastiCache, Scheduler, Step Functions are all OFF by default** — turn them on
  per-environment when you accept the cost and their required targets are deployed.
- Smallest **Graviton/arm64 `t4g`** sizes; single-AZ RDS; single-node ASG; CloudFront
  `PriceClass_100`.
- Lambda + HTTP API + EventBridge are pay-per-use (≈ $0 at rest).

### CloudFront vs ElastiCache — they do different jobs

- **CloudFront** (kept on): a CDN that fronts the **private S3 bucket** via OAC so documents and
  the frontend are served fast and cheap while the bucket stays private. Cost-effective.
- **ElastiCache Redis** (off by default): an in-memory store the **backend actually needs** in
  production for JWT refresh/blacklist, rate limiting, and the Bull job queues (reminders,
  provider dispatch). It is billable, so it is off by default. Cheapest managed option is a
  single `cache.t4g.micro`. If you want to avoid the cost early on, run a small **self-hosted
  Redis on the EC2 host** and point the app's `REDIS_HOST` at localhost — then leave
  `enable_redis = false`.

## Secrets — never committed

Terraform creates the Secrets Manager **containers** but never their values. There is no
`aws_secretsmanager_secret_version` in this code, so no secret is ever in the repo or in a
plaintext-readable form in state.

Inject values out-of-band, e.g. in CI with GitHub OIDC (no long-lived keys):

```bash
aws secretsmanager put-secret-value \
  --secret-id rsf/dev/db-password \
  --secret-string "$DB_PASSWORD"   # sourced from GitHub Encrypted Secrets
```

Secrets used: `db-password`, `jwt-secret`, `encryption-key`, `smile-id-api-key`,
`provider-webhooks`. The RDS module reads `db-password` at apply time via a data source; the
Smile ID Lambda reads `smile-id-api-key` at runtime with a scoped `GetSecretValue` policy.

## Smile ID integration

`modules/api` deploys a Node.js Lambda behind API Gateway (`POST /verify-identity`). It reads
the Smile ID partner key from Secrets Manager at runtime and returns a normalised verification
result. Without a key configured it returns a **simulated** result so the pipeline is testable
end-to-end before any vendor spend. The backend's `compliance/smileid.service.js` mirrors this
contract.

## Reminder Scheduler

The Scheduler is deliberately off until a dedicated reminder Lambda exists. A disabled
schedule still requires a valid AWS target, so Terraform never substitutes an IAM role ARN
as a placeholder target. To enable it, set both values:

```hcl
enable_scheduler    = true
reminder_target_arn = "arn:aws:lambda:af-south-1:123456789012:function:rsf-dev-reminder-tick"
```

Terraform validates that the target is a Lambda function ARN and grants the Scheduler role
only `lambda:InvokeFunction` on that function. The Smile ID Lambda and claims state machine
are not reminder targets. Until a dedicated Lambda calls the reminder service, leave the
Scheduler disabled.

## Notes / follow-ups

- Add an HTTPS (443) ALB listener + ACM certificate and a Route 53 record before production.
- Add a dedicated reminder Lambda adapter that invokes `runDueReminders`; only then enable the
  Scheduler with its function ARN.
- Replace the Step Functions `Pass` states with real `Task` integrations per provider adapter.
