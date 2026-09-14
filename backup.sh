#!/bin/bash

# ==============================================================================
# URSAFE Secure Database Backup Script
# ==============================================================================
# This script securely dumps the PostgreSQL database running in the Docker
# container and saves it locally. It can be scheduled via cron for automated
# disaster recovery.
# ==============================================================================

# Exit immediately if a command exits with a non-zero status.
set -e

# Define variables
BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
BACKUP_FILE="${BACKUP_DIR}/ursafe_db_backup_${TIMESTAMP}.sql"
CONTAINER_NAME="dms-postgres"
DB_USER="dms"
DB_NAME="dms"

# Ensure backup directory exists
mkdir -p "${BACKUP_DIR}"

echo "Starting URSAFE database backup at ${TIMESTAMP}..."

# Execute pg_dump inside the postgres container
# Note: Password is provided via the environment in the docker container.
# If password auth fails, you may need to export PGPASSWORD=... before running.
docker exec -t "${CONTAINER_NAME}" pg_dump -U "${DB_USER}" -d "${DB_NAME}" -F p > "${BACKUP_FILE}"

echo "Backup completed successfully!"
echo "Saved to: ${BACKUP_FILE}"

# Optional: Compress the backup to save disk space
gzip -f "${BACKUP_FILE}"
echo "Compressed backup to: ${BACKUP_FILE}.gz"

# Optional: Enforce backup rotation (keep last 7 days)
# find "${BACKUP_DIR}" -type f -name "*.sql.gz" -mtime +7 -exec rm {} \;
# echo "Cleaned up backups older than 7 days."
