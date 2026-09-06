#!/usr/bin/env bash
set -Eeuo pipefail
IFS=$'\n\t'
umask 077

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
BACKEND_DIR="$(cd -- "${SCRIPT_DIR}/.." && pwd -P)"
STAGE_DIR="${BACKEND_DIR}/.build/reminder-lambda"
ARTIFACT_DIR="${BACKEND_DIR}/dist"
ARTIFACT="${ARTIFACT_DIR}/reminder-lambda.zip"

cleanup() {
  rm -rf -- "${STAGE_DIR}"
}
trap cleanup EXIT

for command in node npm zip; do
  command -v "${command}" >/dev/null 2>&1 || {
    printf 'Required command not found: %s\n' "${command}" >&2
    exit 1
  }
done

node_major="$(node -p 'process.versions.node.split(".")[0]')"
[[ "${node_major}" == "20" ]] || {
  printf 'Node.js 20 is required to build the reminder Lambda (found %s).\n' "$(node --version)" >&2
  exit 1
}

[[ -f "${BACKEND_DIR}/lambda/reminders/handler.js" ]] || {
  printf 'Reminder Lambda handler is missing.\n' >&2
  exit 1
}
[[ -f "${BACKEND_DIR}/package-lock.json" ]] || {
  printf 'package-lock.json is required for a reproducible build.\n' >&2
  exit 1
}

rm -rf -- "${STAGE_DIR}"
mkdir -p -- "${STAGE_DIR}/lambda/reminders" "${ARTIFACT_DIR}"
cp -- "${BACKEND_DIR}/lambda/reminders/handler.js" "${STAGE_DIR}/lambda/reminders/handler.js"
cp -- "${BACKEND_DIR}/package.json" "${BACKEND_DIR}/package-lock.json" "${STAGE_DIR}/"
cp -R -- "${BACKEND_DIR}/src" "${STAGE_DIR}/src"

(
  cd -- "${STAGE_DIR}"
  npm ci --omit=dev --ignore-scripts --no-audit --no-fund
)

# Normalize metadata and order entries so identical inputs produce an identical ZIP.
find "${STAGE_DIR}" -exec touch -h -t 198001010000 {} +
rm -f -- "${ARTIFACT}"
(
  cd -- "${STAGE_DIR}"
  find . -mindepth 1 -print | LC_ALL=C sort | zip -X -q -y "${ARTIFACT}" -@
)

[[ -s "${ARTIFACT}" ]] || {
  printf 'Reminder Lambda artifact was not created.\n' >&2
  exit 1
}
printf 'Created %s\n' "${ARTIFACT}"
