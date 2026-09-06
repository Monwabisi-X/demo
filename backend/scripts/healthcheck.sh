#!/usr/bin/env bash
# External health check. Exits 0 when the API liveness endpoint returns HTTP 200.
set -euo pipefail
URL="${HEALTHCHECK_URL:-http://127.0.0.1:3000/health}"
code=$(curl -fsS -o /dev/null -w '%{http_code}' "$URL" || echo 000)
if [[ "$code" == "200" ]]; then
  echo "healthy ($URL)"
  exit 0
fi
echo "unhealthy: $URL returned $code" >&2
exit 1
