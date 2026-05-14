#!/bin/bash
set -e

echo "Running npm install in server directory..."
cd /var/app/staging/server

echo "Installing npm dependencies (production only)..."
npm install --production

echo "npm install complete"
