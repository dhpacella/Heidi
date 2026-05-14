#!/bin/bash
echo "Setting up admin user..."
cd /var/app/current/server

# Run recreate-admin.js in background so deployment doesn't block
(sleep 5 && node recreate-admin.js 2>&1 | tee -a /var/app/current/admin-setup.log) &

echo "Admin user setup scheduled (running in background)"
exit 0
