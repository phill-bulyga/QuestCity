FROM node:22-alpine AS frontend-build
WORKDIR /build/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
ENV VITE_API_URL=/api/v1
RUN npm run build

FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    FRONTEND_DIR=/app/frontend-dist \
    MEDIA_DIR=/app/media
WORKDIR /app
COPY backend/pyproject.toml ./
COPY backend/app ./app
RUN pip install --no-cache-dir .
COPY backend/alembic.ini ./
COPY backend/alembic ./alembic
COPY backend/scripts ./scripts
COPY --from=frontend-build /build/frontend/dist ./frontend-dist
COPY deploy/start.sh ./start.sh
RUN useradd --create-home questcity && mkdir -p /app/media && chown questcity:questcity /app/media
USER questcity
EXPOSE 10000
CMD ["sh", "/app/start.sh"]
