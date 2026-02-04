#!/bin/bash
# Diagnostic Script - Check Mail Muse Status

echo "=========================================="
echo "MAIL MUSE DIAGNOSTIC CHECK"
echo "=========================================="

echo ""
echo "[1] Checking if latest code is deployed..."
cd /var/www/mail-flow/django_server
if grep -q "CHECKPOINT 1" api/utils/mailer.py; then
    echo "✅ Latest code IS deployed (CHECKPOINT found)"
else
    echo "❌ Latest code NOT deployed (CHECKPOINT missing)"
    echo "   Run: cd /var/www/mail-flow && git pull"
fi

echo ""
echo "[2] Checking Python processes..."
ps aux | grep -E "gunicorn|python.*manage" | grep -v grep

echo ""
echo "[3] Checking service status..."
sudo systemctl status mail-muse --no-pager | head -10

echo ""
echo "[4] Last 20 lines of mailer.log..."
tail -20 mailer.log

echo ""
echo "[5] Checking for errors in logs..."
if grep -i "error\|crash\|fatal" mailer.log | tail -5; then
    echo "⚠️  Errors found above"
else
    echo "✅ No recent errors"
fi

echo ""
echo "[6] Testing database connection..."
python manage.py shell -c "from api.models import EmailCampaign; print(f'Campaigns in DB: {EmailCampaign.objects.count()}')"

echo ""
echo "=========================================="
echo "DIAGNOSTIC COMPLETE"
echo "=========================================="
