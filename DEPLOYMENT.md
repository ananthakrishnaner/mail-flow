# 🚀 Production Deployment Guide

This guide provides a complete, step-by-step workflow to deploy Mail Muse to a production Ubuntu server for the domain **`mail.ak-hospitql.com`**.

**IMPORTANT:** This guide uses the path `/var/www/mail-flow` as configured on your server.

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
sudo mkdir -p /var/www/mail-flow

# Set permissions to www-data (standard web user)
sudo setfacl -R -m u:www-data:rwx /var/www/mail-flow
sudo chown -R www-data:www-data /var/www/mail-flow

cd /var/www/mail-flow
```

## 3. Code Setup

Clone or copy your project code to this directory.

```bash
# Assuming code is already present, just ensure env file exists
cp .env.example .env 2>/dev/null || touch .env
```

## 4. Backend Setup (Django)

Configure the Python backend with Gunicorn.

```bash
cd django_server

# 1. Create Virtual Env (Start as current user, we will chown later)
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

# 5. Fix permissions again (crucial after creating venv/files)
sudo chown -R www-data:www-data /var/www/mail-flow
sudo chmod -R 775 /var/www/mail-flow
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
User=www-data
Group=www-data
WorkingDirectory=/var/www/mail-flow/django_server
ExecStart=/var/www/mail-flow/django_server/venv/bin/gunicorn \
          --access-logfile - \
          --workers 3 \
          --bind unix:/var/www/mail-flow/django_server/mail_muse.sock \
          mail_muse.wsgi:application

[Install]
WantedBy=multi-user.target
```

Start and enable the service:

```bash
sudo systemctl daemon-reload
sudo systemctl start mail-muse
sudo systemctl enable mail-muse
```

## 6. Frontend Setup

Build the React frontend.

```bash
cd /var/www/mail-flow

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

    root /var/www/mail-flow/dist;
    index index.html;

    # Frontend: Serve React App
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend: Proxy API Requests
    location /api/ {
        include proxy_params;
        proxy_pass http://unix:/var/www/mail-flow/django_server/mail_muse.sock;
    }

    # Backend: Serve Admin Static Files
    location /static/ {
        alias /var/www/mail-flow/django_server/staticfiles/;
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

---

## 🔧 Troubleshooting

### Status 203/EXEC
This means the **Gunicorn executable cannot be found** at the path specified in the service file.

**Fix:**
1. Check if the file exists:
   ```bash
   ls -l /var/www/mail-flow/django_server/venv/bin/gunicorn
   ```
2. If it says "No such file", install it:
   ```bash
   cd /var/www/mail-flow/django_server
   source venv/bin/activate
   pip install gunicorn
   ```
3. Restart the service:
   ```bash
   sudo systemctl restart mail-muse
   ```

### 500 Internal Server Error
This is usually a **Permission Issue** with the SQLite database.

**Fix:**
```bash
sudo chown -R www-data:www-data /var/www/mail-flow
sudo chmod -R 775 /var/www/mail-flow
sudo systemctl restart mail-muse
```
