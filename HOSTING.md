# 🌐 Hosting Guide (Ubuntu 24.04)

This step-by-step guide will help you deploy Mail Muse on a fresh Ubuntu server.

## 1. System Setup

Update your system and install necessary packages:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install python3-pip python3-venv nginx git -y
```

## 2. Clone Repository

```bash
cd /var/www
sudo mkdir mail-muse
sudo chown $USER:www-data mail-muse
git clone https://github.com/yourusername/mail-muse.git mail-muse
cd mail-muse
```

## 3. Backend Setup (Django)

1.  **Create Virtual Environment**:
    ```bash
    cd django_server
    python3 -m venv venv
    source venv/bin/activate
    ```

2.  **Install Dependencies**:
    ```bash
    pip install -r requirements.txt
    pip install gunicorn
    ```

3.  **Configure Environment**:
    Create `.env` file:
    ```bash
    nano .env
    ```
    Add:
    ```env
    DEBUG=False
    SECRET_KEY=change-this-to-a-secure-random-string
    ALLOWED_HOSTS=*
    ```

4.  **Initialize**:
    ```bash
    python manage.py collectstatic --noinput
    python manage.py migrate
    ```
    *Note: The application uses **SQLite** by default, so no database configuration is required.*

## 4. Systemd Service (Gunicorn)

Create a service to keep your backend running:

```bash
sudo nano /etc/systemd/system/mail-muse.service
```

Content:
```ini
[Unit]
Description=gunicorn daemon for Mail Muse
After=network.target

[Service]
User=ubuntu
Group=www-data
WorkingDirectory=/var/www/mail-muse/django_server
ExecStart=/var/www/mail-muse/django_server/venv/bin/gunicorn \
          --access-logfile - \
          --workers 3 \
          --threads 2 \
          --bind unix:/var/www/mail-muse/django_server/mail_muse.sock \
          mail_muse.wsgi:application

[Install]
WantedBy=multi-user.target
```
*(Replace `ubuntu` with your server username)*

Start the service:
```bash
sudo systemctl start mail-muse
sudo systemctl enable mail-muse
```

## 5. Frontend Setup

You need Node.js to build the frontend.

1.  **Install Node.js**:
    ```bash
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt install -y nodejs
    ```

2.  **Build Frontend**:
    ```bash
    cd /var/www/mail-muse
    npm install
    npm run build
    ```
    This creates the `/var/www/mail-muse/dist` directory.

## 6. Nginx Configuration

Configure Nginx to serve the frontend and proxy API requests.

```bash
sudo nano /etc/nginx/sites-available/mail-muse
```

Content:
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # Frontend (Static Files)
    location / {
        root /var/www/mail-muse/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API Proxy
    location /api/ {
        include proxy_params;
        proxy_pass http://unix:/var/www/mail-muse/django_server/mail_muse.sock;
    }
    
    # Django Admin Static Files
    location /static/ {
        alias /var/www/mail-muse/django_server/staticfiles/;
    }
}
```

Enable and Restart:
```bash
sudo ln -s /etc/nginx/sites-available/mail-muse /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## 7. SSL Setup (Encrypted HTTPS)

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d yourdomain.com
```

🎉 **Deployment Complete!** Your Mail Muse instance should now be live.
