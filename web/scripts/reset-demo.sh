#!/usr/bin/env sh
# Team only: resets the FastAPI demo state for EVERYONE (consents, game,
# corrections). The token comes from your own shell, never from git or a
# NEXT_PUBLIC_ variable:
#
#   ADMIN_RESET_TOKEN=... API_URL=https://<render-host> sh web/scripts/reset-demo.sh
#
# The server refuses (403) unless ADMIN_RESET_TOKEN is set there too.
set -eu
: "${ADMIN_RESET_TOKEN:?Set ADMIN_RESET_TOKEN in your shell first}"
API_URL="${API_URL:-http://127.0.0.1:8000}"
curl -fsS -X POST "${API_URL%/}/api/admin/reset" -H "X-Admin-Token: ${ADMIN_RESET_TOKEN}"
echo
