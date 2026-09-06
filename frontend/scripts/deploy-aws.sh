#!/usr/bin/env bash
# Build and manually publish the frontend to its dedicated private S3 origin.
# This script never creates infrastructure or credentials. It defaults to a read-only dry run.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
DIST_DIR="${FRONTEND_DIR}/dist"
DRY_RUN="${DRY_RUN:-true}"

required=(FRONTEND_BUCKET CLOUDFRONT_DISTRIBUTION_ID EXPECTED_AWS_ACCOUNT_ID VITE_API_URL)
for name in "${required[@]}"; do
  if [[ -z "${!name:-}" ]]; then
    echo "Missing required environment variable: ${name}" >&2
    exit 1
  fi
done

if [[ ! "${VITE_API_URL}" =~ ^https://[^/[:space:]]+(/.*)?$ ]]; then
  echo "VITE_API_URL must be an absolute HTTPS production URL, for example https://api.example.com/api/v1." >&2
  exit 1
fi

if [[ "${DRY_RUN}" != "true" && "${DRY_RUN}" != "false" ]]; then
  echo "DRY_RUN must be true or false." >&2
  exit 1
fi

for command in aws npm; do
  if ! command -v "${command}" >/dev/null 2>&1; then
    echo "Required command not found: ${command}" >&2
    exit 1
  fi
done

actual_account_id="$(aws sts get-caller-identity --query Account --output text)"
if [[ "${actual_account_id}" != "${EXPECTED_AWS_ACCOUNT_ID}" ]]; then
  echo "Refusing deployment: authenticated AWS account ${actual_account_id} does not match EXPECTED_AWS_ACCOUNT_ID." >&2
  exit 1
fi

aws s3api head-bucket --bucket "${FRONTEND_BUCKET}"
bucket_region="$(aws s3api get-bucket-location --bucket "${FRONTEND_BUCKET}" --query LocationConstraint --output text)"
if [[ "${bucket_region}" == "None" ]]; then
  bucket_region="us-east-1"
fi
expected_origin="${FRONTEND_BUCKET}.s3.${bucket_region}.amazonaws.com"
distribution_json="$(aws cloudfront get-distribution --id "${CLOUDFRONT_DISTRIBUTION_ID}" --output json)"

if ! DISTRIBUTION_JSON="${distribution_json}" EXPECTED_ORIGIN="${expected_origin}" node -e '
  const distribution = JSON.parse(process.env.DISTRIBUTION_JSON).Distribution;
  const origins = distribution?.DistributionConfig?.Origins?.Items ?? [];
  const matches = origins.some((origin) =>
    origin.DomainName === process.env.EXPECTED_ORIGIN &&
    typeof origin.OriginAccessControlId === "string" &&
    origin.OriginAccessControlId.length > 0
  );
  if (!distribution?.DistributionConfig?.Enabled || !matches) process.exit(1);
'; then
  echo "Refusing deployment: distribution ${CLOUDFRONT_DISTRIBUTION_ID} does not have an enabled OAC origin for ${expected_origin}." >&2
  exit 1
fi

echo "== Building frontend for ${VITE_API_URL} =="
(cd "${FRONTEND_DIR}" && VITE_API_URL="${VITE_API_URL}" npm run build)

if [[ ! -f "${DIST_DIR}/index.html" || ! -d "${DIST_DIR}/assets" ]]; then
  echo "Expected a Vite build containing index.html and assets/ at ${DIST_DIR}." >&2
  exit 1
fi

sync_flags=()
if [[ "${DRY_RUN}" == "true" ]]; then
  sync_flags+=(--dryrun)
  echo "== Dry run only; no objects or invalidations will be changed =="
else
  expected_confirmation="${FRONTEND_BUCKET}:${CLOUDFRONT_DISTRIBUTION_ID}"
  if [[ "${CONFIRM_FRONTEND_DEPLOY:-}" != "${expected_confirmation}" ]]; then
    echo "Refusing live deployment. Set CONFIRM_FRONTEND_DEPLOY exactly to ${expected_confirmation}." >&2
    exit 1
  fi
  echo "== Publishing frontend to s3://${FRONTEND_BUCKET} =="
fi

# Upload immutable, content-hashed assets first and retain old assets for safe rollback.
aws s3 sync "${DIST_DIR}/assets/" "s3://${FRONTEND_BUCKET}/assets/" \
  --sse AES256 \
  --cache-control "public,max-age=31536000,immutable" \
  "${sync_flags[@]}"

# Publish mutable entry files separately. --delete cannot touch the excluded assets prefix.
aws s3 sync "${DIST_DIR}/" "s3://${FRONTEND_BUCKET}/" \
  --delete \
  --exclude "assets/*" \
  --sse AES256 \
  --cache-control "no-cache,no-store,must-revalidate" \
  "${sync_flags[@]}"

if [[ "${DRY_RUN}" == "false" ]]; then
  aws cloudfront create-invalidation \
    --distribution-id "${CLOUDFRONT_DISTRIBUTION_ID}" \
    --paths "/" "/index.html"
  echo "== Deployment submitted; old hashed assets were retained for rollback =="
fi
