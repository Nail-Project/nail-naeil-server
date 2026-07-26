#!/usr/bin/env bash

set -Eeuo pipefail

if [ "$#" -ne 4 ]; then
  echo "Usage: deploy-prod.sh <aws-region> <ecr-registry> <image-uri> <env-parameter-name>"
  exit 1
fi

AWS_REGION="$1"
ECR_REGISTRY="$2"
IMAGE_URI="$3"
ENV_PARAMETER_NAME="$4"
APP_DIR="/opt/nail-naeil"
CONTAINER_NAME="nail-naeil-api"
ENV_FILE="${APP_DIR}/.env"
TEMP_ENV_FILE="${APP_DIR}/.env.tmp"

mkdir -p "$APP_DIR"
chmod 700 "$APP_DIR"
trap 'rm -f "$TEMP_ENV_FILE"' EXIT

aws ssm get-parameter \
  --region "$AWS_REGION" \
  --name "$ENV_PARAMETER_NAME" \
  --with-decryption \
  --query "Parameter.Value" \
  --output text > "$TEMP_ENV_FILE"

if [ ! -s "$TEMP_ENV_FILE" ]; then
  echo "Production environment file is empty."
  exit 1
fi

chmod 600 "$TEMP_ENV_FILE"
mv "$TEMP_ENV_FILE" "$ENV_FILE"

aws ecr get-login-password --region "$AWS_REGION" \
  | docker login \
      --username AWS \
      --password-stdin "$ECR_REGISTRY"

docker pull "$IMAGE_URI"

docker run --rm \
  --env-file "$ENV_FILE" \
  "$IMAGE_URI" \
  npx prisma migrate deploy

PREVIOUS_IMAGE="$(docker inspect --format '{{.Config.Image}}' "$CONTAINER_NAME" 2>/dev/null || true)"

docker stop "$CONTAINER_NAME" 2>/dev/null || true
docker rm "$CONTAINER_NAME" 2>/dev/null || true

start_container() {
  local image_uri="$1"

  docker run -d \
    --name "$CONTAINER_NAME" \
    --restart unless-stopped \
    --memory 650m \
    --env-file "$ENV_FILE" \
    --publish 127.0.0.1:3000:3000 \
    "$image_uri"
}

start_container "$IMAGE_URI"

for _ in $(seq 1 12); do
  if [ "$(docker inspect --format '{{.State.Health.Status}}' "$CONTAINER_NAME" 2>/dev/null || true)" = "healthy" ]; then
    docker image prune -af --filter "until=168h"
    echo "Deployment completed: $IMAGE_URI"
    exit 0
  fi

  sleep 5
done

echo "Health check failed for $IMAGE_URI"
docker logs "$CONTAINER_NAME" --tail 100 || true
docker stop "$CONTAINER_NAME" 2>/dev/null || true
docker rm "$CONTAINER_NAME" 2>/dev/null || true

if [ -n "$PREVIOUS_IMAGE" ]; then
  echo "Rolling back to $PREVIOUS_IMAGE"
  start_container "$PREVIOUS_IMAGE"
fi

exit 1
