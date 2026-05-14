#!/bin/bash
set -e

echo "Downloading AWS RDS CA certificate..."

cd /var/app/staging/server

# Download the RDS certificate authority bundle
if ! curl -o rds-ca-bundle.pem "https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem"; then
  echo "Warning: Failed to download RDS certificate, will proceed with rejectUnauthorized: false"
else
  echo "✅ RDS CA certificate downloaded successfully"
  chmod 644 rds-ca-bundle.pem
fi
