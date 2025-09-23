#!/bin/sh
set -e

DB_HOST=${DB_HOST:-postgres}
DB_USER=${DB_USER:-ccuser}
DB_NAME=${DB_NAME:-creditcard}
STORAGE_ACCOUNT=${STORAGE_ACCOUNT}
CONTAINER_NAME=${CONTAINER_NAME:-backups}

DATE=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="backup-${DATE}.sql"

echo "Starting backup at ${DATE}"
pg_dump -h ${DB_HOST} -U ${DB_USER} ${DB_NAME} > /tmp/${BACKUP_FILE}

echo "Authenticating with Azure..."
az login --identity

echo "Uploading backup to Azure Storage..."
az storage blob upload \
  --account-name ${STORAGE_ACCOUNT} \
  --container-name ${CONTAINER_NAME} \
  --name ${BACKUP_FILE} \
  --file /tmp/${BACKUP_FILE} \
  --auth-mode login

rm /tmp/${BACKUP_FILE}
echo "Backup completed successfully"


