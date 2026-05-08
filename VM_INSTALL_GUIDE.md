## 🚀 VM Deployment

For dedicated VM or bare-metal servers, use the multi-container setup via Docker Compose.

### 1. Provisioning
Suggested VM specs for 20+ users:
- **CPU**: 2 vCPUs
- **RAM**: 4GB
- **Disk**: 20GB SSD

### 2. Secure Configuration
Copy `.env.example` to `.env` and set:
- `JWT_SECRET`: Random 64-char string.
- `POSTGRES_PASSWORD`: Strong alphanumeric.
- `NODE_ENV`: `production`.

### 3. Deployment
```bash
# Pull latest code
git pull origin main

# Build and start services
docker-compose up -d --build
```

### 4. Database Initialization
```bash
# Exec into app container to run migrations and seed
docker-compose exec app npx prisma db push
docker-compose exec app node scripts/seed-pg.js
```

## 📂 Data Management
- **Persistence**: All data is stored in the `db-data` and `uploads-data` volumes.
- **Backups**: Use `docker-compose exec db pg_dump -U postgres horizon_it > backup.sql`.
