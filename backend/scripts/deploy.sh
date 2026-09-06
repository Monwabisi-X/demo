#!/usr/bin/env bash
# Deployment helper for the Royal Square backend.
#
# Builds the Docker image, runs migrations, and (optionally) pushes to a registry. Intended
# to be invoked by CI/CD with AWS credentials from an IAM role. This script never contains
# secrets — they are provided by the environment / AWS Secrets Manager at runtime.
set -euo pipefail

IMAGE="${IMAGE:-royal-square-backend}"
TAG="${TAG:-$(git rev-parse --short HEAD 2>/dev/null || echo latest)}"

echo "== Building image ${IMAGE}:${TAG} =="
docker build -t "${IMAGE}:${TAG}" .

if [[ "${RUN_MIGRATIONS:-false}" == "true" ]]; then
  echo "== Running database migrations =="
  npm run migrate:prod
fi

if [[ -n "${REGISTRY:-}" ]]; then
  echo "== Pushing to ${REGISTRY} =="
  docker tag "${IMAGE}:${TAG}" "${REGISTRY}/${IMAGE}:${TAG}"
  docker push "${REGISTRY}/${IMAGE}:${TAG}"
fi

echo "== Done =="
