#!/bin/bash
set -e

echo "🔧 Running npm install in server directory..."
cd /var/app/staging/server

if [ ! -d "node_modules" ]; then
  echo "📦 Installing npm dependencies..."
  npm install
else
  echo "✓ node_modules already exists"
fi

echo "✓ npm install complete"
