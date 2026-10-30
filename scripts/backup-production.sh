#!/usr/bin/env bash
set -euo pipefail
umask 077

: "${MYSQL_DATABASE:?Set MYSQL_DATABASE}"
: "${MYSQL_USER:?Set MYSQL_USER}"
: "${MYSQL_PASSWORD:?Set MYSQL_PASSWORD}"
: "${MEDIA_STORAGE_ROOT:?Set MEDIA_STORAGE_ROOT}"

MYSQL_HOST="${MYSQL_HOST:-127.0.0.1}"
MYSQL_PORT="${MYSQL_PORT:-3306}"
BACKUP_ROOT="${BACKUP_ROOT:-/var/backups/innovex-ecommerce}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
DESTINATION="${BACKUP_ROOT}/${TIMESTAMP}"

mkdir -p "$DESTINATION"
chmod 700 "$BACKUP_ROOT" "$DESTINATION"

MYSQL_CNF="$(mktemp)"
cleanup() {
  rm -f "$MYSQL_CNF"
}
trap cleanup EXIT
chmod 600 "$MYSQL_CNF"
cat > "$MYSQL_CNF" <<CNF
[client]
host=${MYSQL_HOST}
port=${MYSQL_PORT}
user=${MYSQL_USER}
password=${MYSQL_PASSWORD}
CNF

mysqldump --defaults-extra-file="$MYSQL_CNF" \
  --single-transaction --routines --triggers --events \
  --default-character-set=utf8mb4 "$MYSQL_DATABASE" \
  | gzip -9 > "${DESTINATION}/database.sql.gz"

tar -czf "${DESTINATION}/media.tar.gz" -C "$(dirname "$MEDIA_STORAGE_ROOT")" "$(basename "$MEDIA_STORAGE_ROOT")"

find "$BACKUP_ROOT" -mindepth 1 -maxdepth 1 -type d -mtime "+${RETENTION_DAYS}" -exec rm -rf -- {} +

echo "Backup completed: ${DESTINATION}"
