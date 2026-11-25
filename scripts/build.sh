#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
npm --prefix src/main/frontend ci
npm --prefix src/main/frontend run build
./mvnw clean verify
