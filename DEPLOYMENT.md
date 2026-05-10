# POS System Deployment Guide

Follow these steps to deploy the POS system to a production environment.

## Prerequisites
- Docker and Docker Compose installed.
- (Optional) A domain name and SSL certificate (for HTTPS).

## Step 1: Environment Configuration
1.  Copy the `.env.example` file to `.env`:
    ```bash
    cp .env.example .env
    ```
2.  Edit `.env` and set secure values:
    -   Change `POSTGRES_PASSWORD` to a strong password.
    -   Set a strong `JWT_SECRET`.
    -   Update `DATABASE_URL` with the new password.

## Step 2: Build and Launch
Run the following command to build and start all services:
```bash
docker compose up -d --build
```

## Step 3: Database Seeding (First Time Only)
If this is a fresh installation and you want to load default products and the admin user:
```bash
docker exec -it pos_backend npm run db:seed
```

**Default Admin Credentials:**
- Email: `admin@pos.com`
- Password: `admin123` (Please change this immediately after login)

## Step 4: Verification
- Access the POS system at `http://your-server-ip`.
- Verify you can log in with the admin account.
- Check if products are displayed.

## Maintenance
- **View Logs**: `docker compose logs -f`
- **Update System**: `git pull` then `docker compose up -d --build`
- **Backup Database**:
  ```bash
  docker exec -t pos_postgres pg_dumpall -c -U pos_user > dump_$(date +%Y%m%d_%H%M%S).sql
  ```

## Security Recommendations
- **SSL**: It is highly recommended to use a reverse proxy like Traefik or Caddy with automated Let's Encrypt certificates, or configure Nginx with your own certificates.
- **Port Security**: Ensure port 5432 is not exposed to the public internet unless necessary.
