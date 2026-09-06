# `infra/` — Terraform for AWS (plan-only, cost-guarded)

Modular Terraform describing the target AWS footprint for Royal Square Financial. It is
configured for **`init` + `validate` + `plan` only** — there is **no `apply`** in this
repository or its CI. Applying is a deliberate, separate decision made with real credentials.

Region defaults to **`af-south-1` (Cape Town)** for POPIA §72 data residency.

## What it provisions

| Module | Resources | Default |
|--------|-----------|---------|
| `network` | VPC, public + private subnets, IGW, route tables, S3 gateway VPC endpoint; NAT Gateway | NAT **off** |
| `security` | KMS keys (app + medical, rotated, explicit service policies), security groups, EC2/Lambda roles | on |
| `secrets` | Secrets Manager secret **containers** for JWT, encryption, Smile ID, webhooks, and integrations; legacy DB container retained | on (no values) |
| `storage` | Existing private + versioned + SSE-KMS document bucket; legacy CloudFront + OAC retained but unable to decrypt | Legacy resources **on**, delivery inert |
| `frontend_delivery` | Separate private SSE-S3 frontend bucket, OAC, and SPA CloudFront distribution | **off** |
| `registry` | KMS-encrypted ECR repository with immutable tags and scan-on-push; deployed digests are never lifecycle-expired automatically | **off** |
| `database` | RDS PostgreSQL 16, private subnets, encrypted, RDS-managed master password in Secrets Manager | **off** |
| `redis` | Preserved legacy single-node Redis cluster plus an optional parallel Redis OSS 7.1 TLS/IAM replication group | both **off** |
| `compute` | Private ARM64 EC2 ASG running migration/API/worker containers behind an ALB; optional ACM/Route 53 HTTPS | **off** |
| `api` | API Gateway (HTTP API) + Lambda for **Smile ID** identity verification | on (pay-per-use) |
| `automation` | Dedicated VPC reminder Lambda + EventBridge Scheduler + encrypted DLQ; Step Functions claims lifecycle | **off** |

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
  can reach selected AWS services through explicit VPC endpoints. Interface endpoints are
  also billable, so their service list is empty by default and must be chosen deliberately.
- **RDS, ECR, EC2+ALB, ElastiCache, Scheduler, Step Functions are all OFF by default** — turn
  them on per environment when you accept the cost and their dependencies are ready. Scheduler
  creation also creates its encrypted DLQ. When disabling an existing Scheduler, set
  `retain_reminder_dlq = true` in the same reviewed change so queued failure evidence survives;
  `prevent_destroy` makes final queue retirement a separate code review.
- Enabling the EC2 runtime requires RDS, ECR, an image pinned by digest, the selected Redis
  deployment, and either NAT or the private endpoint set shown in `terraform.tfvars.example`;
  Terraform checks this before proposing a runtime that cannot boot. The repository has no
  automatic ECR expiry policy because an active launch template may still reference any pushed
  digest. Image cleanup must first prove the digest is absent from every active launch-template
  version and rollback target.
- Production PostgreSQL clients verify the RDS server certificate and hostname using the RDS CA
  bundle packaged by `aws-ssl-profiles`; `DB_SSL=true` is not a trust-bypass mode.
- Smallest **Graviton/arm64 `t4g`** sizes; single-AZ RDS; single-node ASG; CloudFront
  `PriceClass_100`.
- Lambda + HTTP API + EventBridge are pay-per-use (≈ $0 at rest).

### Document delivery vs frontend delivery

These are deliberately separate paths:

- **Document delivery (`storage`, legacy `enable_cloudfront`)** keeps the existing private,
  versioned SSE-KMS bucket and its current Terraform addresses. The backend remains the
  authorization boundary and returns short-lived, version-aware **direct S3 presigned URLs**.
  The already-applied document CloudFront/OAC/bucket-policy resources stay behind
  `enable_cloudfront` during stage one so Terraform does not destroy them, but the application
  KMS key grants CloudFront no decrypt access. This intentionally makes the unauthenticated
  legacy path inert while its stateful resources await separate retirement.
- **Frontend delivery (`frontend_delivery`, `enable_frontend_delivery`)** is off by default and
  creates a different private SSE-S3 bucket and OAC/distribution. It serves `index.html`, permits
  only HTTPS-redirected GET/HEAD requests, maps S3 403/404 responses to the SPA entry point,
  disables caching by default, and applies CloudFront's optimized cache policy only to
  `/assets/*`. The bucket policy accepts reads only from that exact distribution ARN.

Neither path creates S3 objects through Terraform. Frontend artifacts are built and uploaded as
an explicit release step; backend IAM has no access to the frontend bucket.

### Two-stage frontend migration

**Stage one — additive, with no destroys:**

1. Keep `enable_cloudfront = true`; do not rename, import, move, or repurpose `module.storage`
   resources or the legacy `cloudfront_domain` output. The plan must remove any CloudFront
   decrypt grant from the application KMS policy without deleting the retained distribution.
   After that policy change is separately deployed, invalidate `/*` on the legacy distribution,
   wait for propagation, and verify its document requests fail while backend-issued S3 URLs
   still work.
2. Set `enable_frontend_delivery = true`. For production, set `cors_origin` to the final frontend
   HTTPS origin and build with an absolute API base such as
   `VITE_API_URL=https://api.example.com/api/v1`; CloudFront has no `/api` proxy behavior.
3. Produce and inspect a saved plan. The machine check below must return success and an empty
   array before any separately authorized deployment decision:

   ```bash
   terraform plan -out=stage-one.tfplan
   terraform show -json stage-one.tfplan \
     | jq -e '[.resource_changes[]? | select(.change.actions | index("delete")) | .address] | length == 0'
   terraform show -json stage-one.tfplan \
     | jq '[.resource_changes[]? | select(.address | startswith("module.storage.")) | {address, actions: .change.actions}]'
   ```

   Treat any delete, replacement, or unexpected change under `module.storage` as a blocker. In
   particular, the document bucket is protected by `prevent_destroy`; never bypass that guard.
4. After infrastructure is created through the separately controlled deployment process, use
   `frontend_bucket`, `frontend_cloudfront_domain`, and
   `frontend_cloudfront_distribution_id` outputs with `frontend/scripts/deploy-aws.sh`. Verify
   SPA deep links, API CORS, presigned document upload/download, and logs before continuing.

**Stage two — later legacy retirement, not part of stage one:** only after runtime telemetry and
code/config searches prove that no consumer uses the legacy document CDN or
`CLOUDFRONT_DOMAIN`, plan `enable_cloudfront = false`. The only removals should be the legacy
`module.storage` document distribution, OAC, and bucket policy; the application KMS policy must
remain CloudFront-free and the document bucket/direct presigned flow remain. Reject the plan if either bucket,
any document encryption/versioning resource, or the frontend distribution is deleted or
replaced. Do not reinterpret the legacy output or point `CLOUDFRONT_DOMAIN` at the frontend.

### CloudFront vs ElastiCache — they do different jobs

- **CloudFront** provides edge delivery only for the separate frontend SPA. The retained legacy
  document distribution is intentionally unable to decrypt document objects during stage one;
  it does not authorize document downloads. The backend and direct presigned S3 URLs do.
- **ElastiCache Redis** (both modes off by default): an in-memory store the **backend actually
  needs** in production for JWT refresh/blacklist, rate limiting, and Bull queues. The legacy
  single-node cluster is preserved for migration. `enable_redis_tls` adds a separate Redis OSS
  7.1 replication group with required transit encryption, application-KMS at-rest encryption,
  snapshots, an IAM application user, and a disabled default user. It never creates or accepts a
  static Redis auth token.

## Parallel Redis TLS/IAM rollout

The legacy addresses and output remain unchanged throughout this rollout:

- `module.redis.aws_elasticache_cluster.this[0]`
- `module.redis.aws_elasticache_subnet_group.this[0]`
- root output `redis_endpoint`

The shared subnet group exists when either Redis mode is enabled. During this additive stage,
Terraform also requires `enable_redis = true` whenever `enable_redis_tls = true`, and both the
legacy cluster and subnet group have `prevent_destroy`; a tfvars-only change therefore cannot
remove the rollback source. The parallel resources use new addresses and the existing private
subnets/security group. `redis_tls_num_cache_clusters = 2` is the production-safe default and enables Multi-AZ automatic failover; setting it to `1` is an
explicit non-HA cost trade-off. Daily snapshots default to seven days, a final snapshot name is
configured, and `prevent_destroy` requires a reviewed code change before the TLS group can be
deleted.

`use_redis_tls` selects the endpoint for both EC2 and the reminder Lambda and adds
`REDIS_TLS=true`, `REDIS_AUTH_MODE=iam`, `REDIS_USERNAME`, and `REDIS_IAM_RESOURCE`. The last
value comes directly from the provider-produced lowercase replication-group ID and is kept
separate from the DNS endpoint used by `REDIS_HOST`. It also grants each enabled runtime role
only `elasticache:Connect` on the exact provider-produced replication-group and application-user
ARNs.

### Additive provisioning and cutover

1. Keep `enable_redis = true` and `use_redis_tls = false`. Deploy this IAM/TLS-capable
   application in legacy/no-auth mode before selecting the new cache, and verify the release
   artifact contains the Redis IAM dependencies.
2. Schedule a write outage. Pause the reminder schedule and stop every API/worker or other Redis
   writer. Verify connections and queue producers are quiesced; a snapshot taken while writers
   continue cannot provide a lossless cutover.
3. Create and wait for a **manual snapshot** of the legacy cluster through the controlled AWS
   operations process. Record the exact same-region snapshot **name** (not its ARN; Terraform's
   `snapshot_name` argument does not accept an ElastiCache snapshot ARN). Keep writers quiesced
   because there is no continuous replication between these independent caches.
4. Set `enable_redis_tls = true`, set `redis_tls_initial_snapshot_name` to that manual snapshot,
   and retain both `enable_redis = true` and `use_redis_tls = false`. The snapshot input is for
   initial creation only; changing it later would imply replacement and must be rejected.
5. Produce a saved plan against the real remote state in the authorised deployment environment.
   Do not plan against absent/local state. Require the no-delete check to pass and inspect Redis
   actions explicitly:

   ```bash
   terraform plan -out=redis-parallel.tfplan
   terraform show -json redis-parallel.tfplan \
     | jq -e '[.resource_changes[]? | select(.change.actions | index("delete")) | .address] | length == 0'
   terraform show -json redis-parallel.tfplan \
     | jq '[.resource_changes[]? | select(.address | startswith("module.redis.")) | {address, actions: .change.actions}]'
   ```

   Any delete or replacement is a blocker. In particular, both legacy addresses above must be
   unchanged; the plan should only add the TLS replication group, users, and user group plus
   expected IAM/environment updates.
6. After the separately authorised creation completes, verify encryption, IAM-only access,
   snapshot status, restored queue/data counts, node health, and both endpoints. With writers
   still quiesced, set `use_redis_tls = true`, review the second plan, deploy the IAM/TLS-capable
   runtime, smoke-test API/worker/reminder behavior, and only then resume writers and Scheduler.

**Rollback divergence warning:** once any writer uses the TLS group, the preserved legacy cluster
is stale and the two datasets diverge. Do not treat `use_redis_tls = false` as a data-safe rollback.
First quiesce all writers again, choose the authoritative dataset, and perform a reviewed
snapshot/restore or application-specific reconciliation into a separately prepared rollback
target before changing endpoints. Keep both caches until the observation window closes.

`enable_redis = false` is a **later, separately reviewed destructive cleanup** of the legacy
cluster, never part of parallel provisioning or cutover. It is intentionally blocked by both a
root configuration check and `prevent_destroy`; retirement requires a reviewed code change to
remove those guards after an accepted final/manual legacy snapshot and real-state plan.
Likewise, disabling `enable_redis_tls` is blocked by `prevent_destroy` until an explicit
retirement change is reviewed.

## Secrets — never committed

Terraform creates application secret **containers** but never their values. There is no
`aws_secretsmanager_secret_version` in this code, so application values do not enter Terraform
configuration or state. RDS separately generates and rotates its master password with
`manage_master_user_password`; Terraform exposes only the managed secret ARN.

Inject application values out-of-band, e.g. in CI with GitHub OIDC (no long-lived keys):

```bash
aws secretsmanager put-secret-value \
  --secret-id rsf/dev/jwt-secret \
  --secret-string "$JWT_SECRET"   # sourced from GitHub Encrypted Secrets
```

Application containers use the EC2 instance role to fetch the RDS-managed credential, JWT
secret, and encryption key at startup. The renderer writes the resulting Docker env file only
to `/run/rsf` (tmpfs), never to user data or Terraform state. The retained `db-password`
container is legacy migration state and is not read by RDS or the runtime.

## Backend container runtime

The runtime is intentionally immutable and secret-free at bootstrap:

1. Enable only `enable_container_registry` and plan the ECR repository first.
2. After an operator deliberately creates the planned repository outside this repository's
   plan-only workflow, build `backend/Dockerfile` for `linux/arm64`, push it, and resolve the
   registry digest.
3. Set `backend_image_uri` to `repository@sha256:<digest>`; mutable tags are rejected.
4. Enable RDS, the selected Redis deployment, EC2/ALB, and either NAT or the exact interface
   endpoints in the example. Keep `use_redis_tls=false` until the IAM/TLS client release and
   quiesced snapshot cutover described above.
5. For production, set `enable_https = true`, an in-region ACM certificate ARN, and optionally
   the matching Route 53 hostname/zone. HTTP then redirects to HTTPS.
6. Inspect the full plan for replacements or destroys before making any separate apply decision.

On each EC2 host, systemd pulls the pinned image, renders secrets into `/run/rsf/backend.env`,
runs production-safe migrations, and supervises separate API and worker containers. Containers
run read-only with dropped Linux capabilities. The ALB admits an instance only after `/ready`
can reach PostgreSQL and Redis. CloudWatch log groups use the application KMS key and explicit
retention. The EC2 role is scoped to the one ECR repository, named secrets, document bucket,
KMS keys, and runtime log groups.

When NAT is disabled, the S3 gateway endpoint plus ECR, Secrets Manager, KMS, Logs, and SSM
interface endpoints are required. Enabling Koisa additionally makes `bedrock-runtime` mandatory;
Terraform rejects a no-NAT configuration without it. External product-provider APIs still require
controlled internet egress (for example, a NAT gateway); AWS interface endpoints do not provide
that connectivity.

## Koisa / Amazon Bedrock

Koisa is off by default (`enable_koisa = false`). Enabling it requires all of the following:

- `enable_ec2_alb = true` so there is an application runtime to receive the configuration,
- an explicit `bedrock_region` equal to the deployment `region` (there is no regional fallback),
- an explicit `bedrock_model_id`,
- a non-empty `bedrock_invoke_resource_arns` set containing only exact, in-region Bedrock model
  or inference-profile ARNs (wildcards are rejected), and
- either NAT or the `bedrock-runtime` interface endpoint.

The EC2 runtime role then receives only `bedrock:InvokeModel` on that exact ARN set. It never
receives wildcard model access or `bedrock:InvokeModelWithResponseStream`. Model identifiers,
regions, and bounded loop/timeout/token/result-size settings are static non-secret environment
values; credentials come from the EC2 role through the AWS SDK default credential chain. Do not
put API keys, credentials, prompts, or other secrets in Terraform variables or tfvars.

## Smile ID integration

`modules/api` deploys a Node.js Lambda behind API Gateway (`POST /verify-identity`). It reads
the Smile ID partner key from Secrets Manager at runtime and returns a normalised verification
result. Without a key configured it returns a **simulated** result so the pipeline is testable
end-to-end before any vendor spend. The backend's `compliance/smileid.service.js` mirrors this
contract.

## Reminder Scheduler

The scheduler remains off by default. When enabled, Terraform creates a dedicated Node.js 20
VPC Lambda, role, log group, security group, RDS/Redis ingress, Scheduler role, and an
application-KMS-encrypted SQS DLQ. Scheduler invokes only the repository-managed reminder
Lambda at `08:00 Africa/Johannesburg`; Smile ID and claims cannot be substituted as targets.
The Lambda reads only the RDS-managed credential secret, materialises due reminders, and then
reconciles queued notification rows. It does not use ECR.

Exact enablement sequence:

1. Apply database migration `011_reminder_outbox.sql` through the normal backend migration
   process before invoking the Lambda.
2. Use Node.js 20 in `backend/` and run `npm run build:reminder-lambda`. This creates the ignored
   `backend/dist/reminder-lambda.zip`; Terraform never runs `npm install`.
3. Set `enable_ec2_alb = true`, `enable_rds = true`, and enable the Redis deployment selected
   by `use_redis_tls`. The EC2 worker consumes Bull delivery jobs; Scheduler cannot be enabled
   without the selected cache. During the parallel migration, keep the legacy cluster enabled
   until the separately reviewed cleanup.
4. Provide private AWS API access with either `enable_nat_gateway = true`, or keep endpoints on
   and include `"secretsmanager"` in `interface_endpoint_services`. ECR endpoints are not needed
   for this ZIP Lambda.
5. Set `enable_scheduler = true` and, if needed, override
   `reminder_lambda_artifact_path = "../backend/dist/reminder-lambda.zip"`.
6. Run `terraform fmt -recursive`, `terraform init -backend=false`, and `terraform validate`,
   then review a non-credentialed/local plan before any separately authorised apply.

Enabling adds recurring RDS and ElastiCache cost, plus either NAT or interface-endpoint cost.
Lambda, Scheduler, SQS, logs, and KMS are usage-based. Reserved Lambda concurrency is one; DB
row locking and the occurrence uniqueness constraint remain the authoritative concurrency and
idempotency controls.

## Notes / follow-ups

- Wire a real notification provider adapter and propagate the notification UUID as its provider
  idempotency key; simulation and fail-closed no-provider behavior remain supported.
- Replace the Step Functions `Pass` states with real `Task` integrations per provider adapter.
