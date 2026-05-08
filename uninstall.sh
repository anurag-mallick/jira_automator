#!/bin/bash

# ============================================
#    HORIZON IT — Uninstallation Script
# ============================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}Uninstalling Horizon IT...${NC}"

# Detect Mode
if [ -f "docker-compose.yml" ] && docker-compose ps -q app &>/dev/null; then
    echo -e "Docker installation detected. Cleaning up..."
    docker-compose down -v
elif command -v pm2 &>/dev/null && pm2 list | grep -q "horizon-it"; then
    echo -e "Native installation detected. Cleaning up..."
    pm2 delete "horizon-it"
    pm2 save
    
    # Optional Database cleanup
    read -p "Would you like to DELETE the database 'horizon_it'? (Type YES to confirm): " CONFIRM
    if [[ "$CONFIRM" == "YES" ]]; then
        if [[ "$(uname)" == "Darwin" ]]; then
            psql postgres -c "DROP DATABASE horizon_it;" 2>/dev/null
            psql postgres -c "DROP USER horizon_user;" 2>/dev/null
        else
            sudo -u postgres psql -c "DROP DATABASE horizon_it;" 2>/dev/null
            sudo -u postgres psql -c "DROP USER horizon_user;" 2>/dev/null
        fi
        echo -e "${GREEN}Database deleted.${NC}"
    fi
else
    echo -e "${RED}No active installation found.${NC}"
fi

echo -e "${GREEN}Uninstallation complete.${NC}"
