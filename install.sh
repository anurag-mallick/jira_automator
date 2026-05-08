#!/bin/bash

# ============================================
#    HORIZON IT — Installation Wizard
# ============================================
set -eo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}   HORIZON IT — Installation Wizard${NC}"
echo -e "${BLUE}============================================${NC}"

# Detect OS
OS_TYPE="$(uname)"
DISTRO="Unknown"

if [[ "$OS_TYPE" == "Darwin" ]]; then
    DISTRO="macOS"
elif [[ "$OS_TYPE" == "Linux" ]]; then
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        DISTRO=$NAME
    fi
fi

echo -e "System detected: ${GREEN}$DISTRO ($OS_TYPE)${NC}"

# Prerequisite Checks & Auto-Install
check_deps() {
    # Git
    if ! command -v git &> /dev/null; then
        echo -e "${YELLOW}Git not found. Attempting to install...${NC}"
        if [[ "$OS_TYPE" == "Darwin" ]]; then
            if ! command -v brew &> /dev/null; then
                echo "Installing Homebrew first..."
                /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
            fi
            brew install git
        elif command -v apt-get &> /dev/null; then
            sudo apt-get update && sudo apt-get install -y git
        elif command -v dnf &> /dev/null; then
            sudo dnf install -y git
        else
            echo -e "${RED}Please install Git manually and try again.${NC}"
            exit 1
        fi
    fi

    # Node.js
    if ! command -v node &> /dev/null; then
        echo -e "${YELLOW}Node.js not found. Attempting to install...${NC}"
        if [[ "$OS_TYPE" == "Darwin" ]]; then
            brew install node@20
            brew link --overwrite node@20
        elif command -v apt-get &> /dev/null; then
            curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
            sudo apt-get install -y nodejs
        elif command -v dnf &> /dev/null; then
            sudo dnf install -y nodejs
        else
            echo -e "${RED}Please install Node.js 18+ manually and try again.${NC}"
            exit 1
        fi
    fi
}

check_deps

# Step B: Interactive Configuration
clear
echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}   HORIZON IT — Installation Wizard${NC}"
echo -e "${BLUE}============================================${NC}"
echo -e ""

# 1. Environment Selection
echo -e "Choose your deployment environment:"
echo -e "  [1] Local System — Optimized for personal desktop/laptop."
echo -e "  [2] Virtual Machine / Server — Optimized for shared network access."
ENV_CHOICE=""
while [[ ! "$ENV_CHOICE" =~ ^[12]$ ]]; do
    read -p "Enter choice (1 or 2): " ENV_CHOICE
done

# 2. Database Selection
echo -e "\nChoose your database method:"
echo -e "  [1] Docker — Recommended. Fully containerized."
echo -e "  [2] Native — No Docker needed. Uses PostgreSQL installed directly."
DB_CHOICE=""
while [[ ! "$DB_CHOICE" =~ ^[12]$ ]]; do
    read -p "Enter choice (1 or 2): " DB_CHOICE
done

# 3. Roundcube Integration
echo -e "\nConfigure Roundcube Email Integration:"
read -p "Enter Roundcube Email (e.g., support@domain.in): " EMAIL_ID
read -p "Enter Email Password: " EMAIL_PW
read -p "Enter IMAPS Port (default 993): " IMAP_PORT
IMAP_PORT=${IMAP_PORT:-993}

# Extract host from email
MAIL_HOST="mail.$(echo $EMAIL_ID | sed 's/.*@//')"

# Clone repository
if [ ! -f "package.json" ]; then
    echo -e "${YELLOW}Cloning repository...${NC}"
    git clone https://github.com/anurag-mallick/IT-Project-Management-Local.git horizon-it
    cd horizon-it || exit
fi

# Generate Secrets
echo -e "${YELLOW}Generating secure random keys...${NC}"
JWT_SECRET=$(LC_ALL=C tr -dc 'a-zA-Z0-9' < /dev/urandom | fold -w 48 | head -n 1)
DB_PASSWORD=$(LC_ALL=C tr -dc 'a-zA-Z0-9' < /dev/urandom | fold -w 24 | head -n 1)
ADMIN_PASSWORD=$(LC_ALL=C tr -dc 'a-zA-Z0-9' < /dev/urandom | fold -w 16 | head -n 1)

# Detect Local IP
if [[ "$OS_TYPE" == "Darwin" ]]; then
    LOCAL_IP=$(ipconfig getifaddr en0 || ipconfig getifaddr en1 || echo "localhost")
else
    LOCAL_IP=$(hostname -I | awk '{print $1}' || echo "localhost")
fi

install_docker() {
    echo -e "${YELLOW}Starting Docker installation...${NC}"
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}Docker is not installed. Please install Docker and try again.${NC}"
        exit 1
    fi
    if ! docker info &> /dev/null; then
        echo -e "${RED}Docker is not running. Please start Docker and try again.${NC}"
        exit 1
    fi

    # Write .env
    cat <<EOF > .env
POSTGRES_PASSWORD=$DB_PASSWORD
JWT_SECRET=$JWT_SECRET
NEXT_PUBLIC_APP_URL=http://${LOCAL_IP}:3000
NODE_ENV=production

# Email Configuration (SMTP - Outgoing)
SMTP_HOST=$MAIL_HOST
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=$EMAIL_ID
SMTP_PASS=$EMAIL_PW
SMTP_FROM='IT Support <$EMAIL_ID>'

# Email Configuration (IMAP - Incoming)
IMAP_HOST=$MAIL_HOST
IMAP_PORT=$IMAP_PORT
IMAP_USER=$EMAIL_ID
IMAP_PASS=$EMAIL_PW
IMAP_TICKET_FOLDER=INBOX
EOF

    echo -e "Building containers (3-5 mins)..."
    docker-compose down --remove-orphans 2>/dev/null
    docker-compose up -d --build

    echo -e "Waiting for database to be ready..."
    MAX_WAIT=60
    WAITED=0
    until [ "$(docker-compose ps db | grep 'healthy')" ] || [ $WAITED -ge $MAX_WAIT ]; do
        sleep 3
        WAITED=$((WAITED + 3))
    done

    if ! docker-compose ps db | grep 'healthy' >/dev/null; then
        echo -e "${RED}Database did not become healthy in time. Check Docker logs.${NC}"
        exit 1
    fi

    echo -e "Running migrations..."
    docker-compose exec -T app npx prisma db push --accept-data-loss

    echo -e "Seeding admin..."
    docker-compose exec -T -e ADMIN_PASS="$ADMIN_PASSWORD" app node -e "
const { PrismaClient } = require('./src/generated/prisma');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();
async function main() {
  const hashed = await bcrypt.hash(process.env.ADMIN_PASS, 10);
  await prisma.user.upsert({
    where: { email: 'admin@horizonit.local' },
    update: { password: hashed },
    create: {
      email: 'admin@horizonit.local',
      username: 'admin',
      name: 'Administrator',
      role: 'ADMIN',
      password: hashed,
      isActive: true
    }
  });
  console.log('Admin user ready.');
  await prisma.\$disconnect();
}
main().catch(err => { console.error(err); process.exit(1); });
"
}

install_native() {
    echo -e "${YELLOW}Starting Native installation...${NC}"
    
    # 1. Install PostgreSQL
    if ! command -v psql &> /dev/null; then
        echo -e "Installing PostgreSQL..."
        if [[ "$OS_TYPE" == "Darwin" ]]; then
            brew install postgresql@16
            brew link --force postgresql@16
            brew services start postgresql@16
        elif command -v apt-get &> /dev/null; then
            sudo apt-get update && sudo apt-get install -y postgresql postgresql-contrib
            sudo systemctl start postgresql
        fi
    fi

    # 2. Setup DB
    echo -e "Configuring database..."
    if [[ "$OS_TYPE" == "Darwin" ]]; then
        psql postgres -c "CREATE DATABASE horizon_it;" 2>/dev/null
        psql postgres -c "CREATE USER horizon_user WITH PASSWORD '$DB_PASSWORD';" 2>/dev/null
        psql postgres -c "GRANT ALL PRIVILEGES ON DATABASE horizon_it TO horizon_user;" 2>/dev/null
        psql postgres -c "ALTER DATABASE horizon_it OWNER TO horizon_user;" 2>/dev/null
    else
        sudo -u postgres psql -c "CREATE DATABASE horizon_it;" 2>/dev/null
        sudo -u postgres psql -c "CREATE USER horizon_user WITH PASSWORD '$DB_PASSWORD';" 2>/dev/null
        sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE horizon_it TO horizon_user;" 2>/dev/null
        sudo -u postgres psql -c "ALTER DATABASE horizon_it OWNER TO horizon_user;" 2>/dev/null
    fi

    # 3. Write .env
    cat <<EOF > .env
DATABASE_URL=postgresql://horizon_user:$DB_PASSWORD@localhost:5432/horizon_it
JWT_SECRET=$JWT_SECRET
NEXT_PUBLIC_APP_URL=http://${LOCAL_IP}:3000
NODE_ENV=production

# Email Configuration (SMTP - Outgoing)
SMTP_HOST=$MAIL_HOST
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=$EMAIL_ID
SMTP_PASS=$EMAIL_PW
SMTP_FROM='IT Support <$EMAIL_ID>'

# Email Configuration (IMAP - Incoming)
IMAP_HOST=$MAIL_HOST
IMAP_PORT=$IMAP_PORT
IMAP_USER=$EMAIL_ID
IMAP_PASS=$EMAIL_PW
IMAP_TICKET_FOLDER=INBOX
EOF

    # 4. Install & Build
    echo -e "Installing dependencies and building app..."
    npm install --production=false
    npx prisma generate
    npx prisma db push --accept-data-loss

    # 5. Seed Admin
    ADMIN_PASS="$ADMIN_PASSWORD" node -e "
const { PrismaClient } = require('./src/generated/prisma');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();
async function main() {
  const hashed = await bcrypt.hash(process.env.ADMIN_PASS, 10);
  await prisma.user.upsert({
    where: { email: 'admin@horizonit.local' },
    update: { password: hashed },
    create: {
      email: 'admin@horizonit.local',
      username: 'admin',
      name: 'Administrator',
      role: 'ADMIN',
      password: hashed,
      isActive: true
    }
  });
  console.log('Admin user ready.');
  await prisma.\$disconnect();
}
main().catch(err => { console.error(err); process.exit(1); });
"
    npm run build

    # 6. PM2 for auto-restart
    if ! command -v pm2 &> /dev/null; then
        sudo npm install -g pm2
    fi
    pm2 delete "horizon-it" 2>/dev/null || true
    pm2 start npm --name "horizon-it" -- start
    
    # Save process list and setup startup script
    echo -e "${YELLOW}Setting up system startup for PM2...${NC}"
    pm2 startup | tail -n 1 | bash
    pm2 save
}

if [[ "$DB_CHOICE" == "1" ]]; then
    install_docker
    MODE="Docker"
    STOP_CMD="docker-compose stop"
    START_CMD="docker-compose start"
else
    install_native
    MODE="Native"
    STOP_CMD="pm2 stop horizon-it"
    START_CMD="pm2 start horizon-it"
fi

# Summary
INFO_FILE="INSTALL_INFO.txt"
DATE=$(date)

cat <<EOF > $INFO_FILE
============================================
HORIZON IT — Installation Details
============================================
Installed on : $DATE
Install mode : $MODE
Machine IP   : $LOCAL_IP

ACCESS DETAILS
--------------------------------------
URL          : http://$LOCAL_IP:3000
Admin Email  : admin@horizonit.local
Admin Password: $ADMIN_PASSWORD

MANAGEMENT
--------------------------------------
Stop app     : $STOP_CMD
Start app    : $START_CMD
Uninstall    : bash uninstall.sh

IMPORTANT
--------------------------------------
- Keep this file secure.
- Change password after first login.
============================================
EOF

clear
echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}   HORIZON IT — Installation Complete!${NC}"
echo -e "${BLUE}============================================${NC}"
echo -e "\n  Access URL    : ${GREEN}http://$LOCAL_IP:3000${NC}"
echo -e "  Admin Email   : admin@horizonit.local"
echo -e "  Admin Password: ${YELLOW}$ADMIN_PASSWORD${NC}"
echo -e "\n  Stop app     : $STOP_CMD"
echo -e "  Start app    : $START_CMD"
echo -e "\n  Details saved to: $INFO_FILE"
echo -e "${BLUE}============================================${NC}"
echo -e ""
read -p "Installation complete. Press Enter to continue and close..." 
