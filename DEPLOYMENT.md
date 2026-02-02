# 🚀 Production Deployment Guide

This guide provides a complete, step-by-step workflow to deploy Mail Muse to a production Ubuntu server for the domain **`mail.ak-hospitql.com`**.

## Prerequisites
- A server running **Ubuntu 24.04** (or 20.04/22.04).
- Root or `sudo` access.
- DNS configured: `mail.ak-hospitql.com` pointing to your server IP.

---

## 1. System Preparation

Update your system and install essential packages (Python 3, Nginx, Git, ACL).

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install dependencies
sudo apt install python3-pip python3-venv nginx git acl -y
```

## 2. Directory & Permissions

Set up the web directory and ensure your user has permissions.

```bash
# Create directory
sudo mkdir -p /var/www/mail-muse

# Set permissions (replace 'ubuntu' with your actual username if different)
sudo setfacl -R -m u:ubuntu:rwx /var/www/mail-muse
sudo chown -R ubuntu:www-data /var/www/mail-muse

cd /var/www/mail-muse
```

## 3. Clone Repository

Clone your project code.

```bash
# Clone the repo (replace with your actual repo URL)
git clone https://github.com/yourusername/mail-muse.git .

# Create environmental file
cp .env.example .env 2>/dev/null || touch .env
```

## 4. Backend Setup (Django)

Configure the Python backend with Gunicorn.

```bash
cd django_server

# 1. Create Virtual Env
python3 -m venv venv
source venv/bin/activate

# 2. Install Dependencies
pip install -r requirements.txt
pip install gunicorn

# 3. Configure .env
nano .env
```

Paste the following into `.env` (Ctrl+O to save, Ctrl+X to exit):

```ini
DEBUG=False
SECRET_KEY=change-this-to-a-secure-random-string
ALLOWED_HOSTS=mail.ak-hospitql.com,localhost,127.0.0.1
```

```bash
# 4. Initialize Database & Static Files
python manage.py collectstatic --noinput
python manage.py migrate
```

## 5. Backend Service (systemd)

Set up Gunicorn to keep the backend running automatically.

```bash
sudo nano /etc/systemd/system/mail-muse.service
```

Paste the following:

```ini
[Unit]
Description=Gunicorn daemon for Mail Muse
After=network.target

[Service]
User=ubuntu
Group=www-data
WorkingDirectory=/var/www/mail-muse/django_server
ExecStart=/var/www/mail-muse/django_server/venv/bin/gunicorn \
          --access-logfile - \
          --workers 3 \
          --bind unix:/var/www/mail-muse/django_server/mail_muse.sock \
          mail_muse.wsgi:application

[Install]
WantedBy=multi-user.target
```

Start and enable the service:

```bash
sudo systemctl start mail-muse
sudo systemctl enable mail-muse
```

## 6. Frontend Setup

Build the React frontend.

```bash
cd /var/www/mail-muse

# Install Node.js (if not installed)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install Dependencies & Build
npm install
npm run build
```

Verify that the `dist` folder exists: `ls -l dist`

## 7. Nginx Configuration

Configure Nginx to handle domain traffic and proxy API requests.

```bash
sudo nano /etc/nginx/sites-available/mail-muse
```

Paste the following configuration:

```nginx
server {
    listen 80;
    server_name mail.ak-hospitql.com;

    root /var/www/mail-muse/dist;
    index index.html;

    # Frontend: Serve React App
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend: Proxy API Requests
    location /api/ {
        include proxy_params;
        proxy_pass http://unix:/var/www/mail-muse/django_server/mail_muse.sock;
    }

    # Backend: Serve Admin Static Files
    location /static/ {
        alias /var/www/mail-muse/django_server/staticfiles/;
    }
}
```

Enable the site and restart Nginx:

```bash
sudo ln -s /etc/nginx/sites-available/mail-muse /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## 8. SSL Certificate (HTTPS)

Secure your domain with a free Let's Encrypt certificate.

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d mail.ak-hospitql.com
```

## 9. Firewall Setup

Ensure your firewall allows web traffic.

```bash
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

---

## ✅ Deployment Checklist

- [ ] **Domain**: navigate to `https://mail.ak-hospitql.com`
- [ ] **API**: Check `https://mail.ak-hospitql.com/api/config`
- [ ] **Scheduler**: The backend scheduler runs automatically inside the Gunicorn workers.

**Troubleshooting:**
- Backend logs: `sudo journalctl -u mail-muse -f`
- Nginx logs: `sudo tail -f /var/log/nginx/error.log`
