#!/bin/bash
set -e

echo "Running npm install in server directory..."
cd /var/app/staging/server

echo "Installing npm dependencies..."
npm install

echo "npm install complete"
