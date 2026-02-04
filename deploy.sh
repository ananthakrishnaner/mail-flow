#!/bin/bash
# Full Deployment Script for Mail Muse

echo "=========================================="
echo "MAIL MUSE DEPLOYMENT SCRIPT"
echo "=========================================="

# Navigate to project root
cd /var/www/mail-flow

echo ""
echo "[1/6] Pulling latest code..."
git pull

echo ""
echo "[2/6] Installing frontend dependencies..."
npm install

echo ""
echo "[3/6] Building frontend..."
npm run build

echo ""
echo "[4/6] Installing backend dependencies..."
cd django_server
source venv/bin/activate
pip install -r requirements.txt

echo ""
echo "[5/6] Clearing Python cache..."
find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null
find . -name "*.pyc" -delete

echo ""
echo "[6/6] Restarting services..."
sudo systemctl restart mail-muse
sudo systemctl restart nginx

echo ""
echo "=========================================="
echo "Deployment Status:"
echo "=========================================="
echo ""
echo "Backend Status:"
sudo systemctl status mail-muse --no-pager -l | head -15

echo ""
echo "=========================================="
echo "✅ Deployment Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Check https://your-domain.com"
echo "2. Test campaign creation"
echo "3. Check server logs in UI"
echo ""
