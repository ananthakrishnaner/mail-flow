#!/bin/bash

# Fix permissions for SQLite database on Ubuntu/Debian (Nginx/Gunicorn)
# This script must be run with sudo

echo "Fixing permissions for django_server..."

cd "$(dirname "$0")"

# Set ownership to www-data (standard for web servers)
chown -R www-data:www-data .

# Set specific permissions for SQLite
# Database file needs read/write
chmod 664 db.sqlite3

# Directory needs read/write/execute (for creating journal files)
chmod 775 .

# Restart services
systemctl restart gunicorn
systemctl restart nginx

echo "Permissions fixed and services restarted."
