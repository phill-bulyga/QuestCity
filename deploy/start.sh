#!/bin/sh
set -eu
alembic upgrade head
if [ "${SEED_DEMO:-false}" = "true" ]; then
    python -m scripts.seed_render_demo
fi
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-10000}" --proxy-headers
