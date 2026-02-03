#!/bin/bash

# Restart services for Mail Muse
# This script must be run with sudo

echo "Restarting services..."

# Restart Gunicorn (Service name: mail-muse)
if systemctl list-units --full -all | grep -Fq "mail-muse.service"; then
    echo "Restarting mail-muse.service..."
    systemctl restart mail-muse
else
    echo "Error: mail-muse.service not found!"
    echo "Please check /etc/systemd/system/mail-muse.service"
fi

# Restart Nginx
echo "Restarting nginx..."
systemctl restart nginx

echo "Done."
