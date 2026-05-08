#!/bin/bash

# ===================================================
#     HORIZON IT - AUTOMATED SETUP UTILITY
# ===================================================

# Color definitions
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}===================================================${NC}"
echo -e "${BLUE}    HORIZON IT - AUTOMATED SETUP UTILITY (macOS)${NC}"
echo -e "${BLUE}===================================================${NC}"
echo

# 1. Check for Node.js
echo -e "[1/6] ${YELLOW}Checking for Node.js...${NC}"
if ! command -v node &> /dev/null
then
    echo -e "${RED}[CRITICAL ERROR] Node.js is not installed!${NC}"
    echo "Please download and install it from: https://nodejs.org/"
    exit 1
fi
echo -e "      - Node.js found: $(node -v)"

# 2. Check for Docker
echo -e "[2/6] ${YELLOW}Checking for Docker...${NC}"
if ! command -v docker &> /dev/null
then
    echo -e "${RED}[CRITICAL ERROR] Docker is not installed or not in your PATH!${NC}"
    echo "Please install Docker Desktop: https://www.docker.com/products/docker-desktop/"
    exit 1
fi

if ! docker info &> /dev/null
then
    echo -e "${RED}[CRITICAL ERROR] Docker is NOT running!${NC}"
    echo "Please start Docker Desktop and run this script again."
    exit 1
fi
echo -e "      - Docker is running."

# 3. Prepare Environment
echo -e "[3/6] ${YELLOW}Preparing environment variables...${NC}"
if [ ! -f .env ]; then
    echo -e "      - Creating .env from .env.example..."
    cp .env.example .env
    # Replace @db: with @localhost: for local machine access
    sed -i '' 's/@db:/@localhost:/g' .env
    
    # Generate a random JWT_SECRET
    RANDOM_SECRET=$(LC_ALL=C tr -dc 'a-zA-Z0-9' < /dev/urandom | fold -w 64 | head -n 1)
    sed -i '' "s/JWT_SECRET=.*/JWT_SECRET=$RANDOM_SECRET/g" .env
    
    echo -e "      - .env file created and configured for localhost."
else
    echo -e "      - .env file already exists."
fi

# 4. Install Dependencies
echo -e "[4/6] ${YELLOW}Installing NPM dependencies (this may take a minute)...${NC}"
npm install --prefer-offline --no-audit --no-fund
if [ $? -ne 0 ]; then
    echo -e "${RED}[ERROR] Dependency installation failed.${NC}"
    exit 1
fi

# 5. Initialize Database
echo -e "[5/6] ${YELLOW}Starting database and syncing schema...${NC}"
docker-compose up -d db
if [ $? -ne 0 ]; then
    echo -e "${RED}[ERROR] Failed to start Docker database.${NC}"
    exit 1
fi

echo -e "      - Waiting for database readiness (10s)..."
sleep 10

echo -e "      - Generating Prisma client..."
npx prisma generate

echo -e "      - Pushing Prisma schema..."
npx prisma db push
if [ $? -ne 0 ]; then
    echo -e "${YELLOW}[WARNING] Schema sync failed. Retrying in 5s...${NC}"
    sleep 5
    npx prisma db push
fi

# 6. Seed Database
echo -e "[6/6] ${YELLOW}Seeding default admin account...${NC}"
node scripts/seed-local.js
if [ $? -ne 0 ]; then
    echo -e "${RED}[ERROR] Seeding failed.${NC}"
    exit 1
fi

echo
echo -e "${GREEN}===================================================${NC}"
echo -e "${GREEN}             SETUP COMPLETE SUCCESSFULLY!${NC}"
echo -e "${GREEN}===================================================${NC}"
echo
echo -e "  ACCESS:     ${BLUE}http://localhost:3000${NC}"
echo
echo -e "  ${YELLOW}ADMIN EMAIL:${NC}    admin@horizon-it.local"
echo -e "  ${YELLOW}ADMIN PASSWORD:${NC} AdminPassword123!"
echo
echo -e "${GREEN}===================================================${NC}"
echo

read -p "Would you like to start the server now? (y/N): " START_NOW
if [[ "$START_NOW" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    echo -e "${BLUE}Starting server...${NC}"
    npm run dev
else
    echo
    echo "To start later, run: npm run dev"
    echo
fi
