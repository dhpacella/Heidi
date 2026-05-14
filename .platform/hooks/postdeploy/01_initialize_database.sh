#!/bin/bash

cd /var/app/current/server

echo "🔧 Initializing database..."
timeout 30 node migrate-volunteer-tables.js || echo "Tables already exist"

echo "👤 Setting up admin user..."
timeout 30 node create-admin-safe.js || echo "Admin user already exists"

echo "✅ Database initialization complete"

