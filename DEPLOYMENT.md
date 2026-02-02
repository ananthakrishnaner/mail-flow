# 🚀 Deployment Guide

This guide describes the architecture and deployment process for Mail Muse (Django + React).

## 🏗️ Architecture

Mail Muse consists of two distinct parts:
1.  **Backend (Django)**: A Python REST API that handles database interactions, email sending, and scheduling.
2.  **Frontend (React)**: A static Single Page Application (SPA) built with Vite that consumes the API.

In a production environment, you should use a reverse proxy (like Nginx) to:
- Serve the **Frontend** static files (HTML, CSS, JS) from the root path `/`.
- Proxy API requests from `/api` to the **Backend** application server (Gunicorn).

## 1. Frontend Deployment

The frontend must be built locally or on the server.

```bash
# Install dependencies
npm install

# Build the project
npm run build
```

This creates a `dist` folder. These files should be copied to your web directory (e.g., `/var/www/mail-muse/dist`).

## 2. Backend Deployment

The backend requires Python 3.10+ and a production WSGI server.

1.  **Install Dependencies**:
    ```bash
    cd django_server
    pip install -r requirements.txt
    pip install gunicorn  # Production server
    ```

2.  **Environment Variables**:
    Create a `.env` file in `django_server/`:
    ```env
    DEBUG=False
    SECRET_KEY=your-production-secret-key
    ALLOWED_HOSTS=*
    # Database is SQLite by default, no configuration needed.
    ```

3.  **Database & Assets**:
    ```bash
    python manage.py collectstatic  # Collects admin/static files
    python manage.py migrate        # Apply database schema
    ```

4.  **Run with Gunicorn**:
    ```bash
    gunicorn mail_muse.wsgi:application --bind 127.0.0.1:8000
    ```

## 3. Background Tasks (Scheduler)

Mail Muse has a built-in scheduler for sending emails. In production, this runs as a background thread within the Django process. Ensure your WSGI server allows threads (Gunicorn's default sync worker is fine, or use `gthread`).

Example Gunicorn command with threads:
```bash
gunicorn mail_muse.wsgi:application --bind 127.0.0.1:8000 --threads 4
```
