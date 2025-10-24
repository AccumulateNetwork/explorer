#!/bin/bash
# Deploy Explorer to beta.explorer.accumulatenetwork.io
# Usage: ./deploy-beta.sh [beta-server-user@host]

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Explorer Beta Deployment ===${NC}"
echo "Commit: $(git log --oneline -1)"
echo "Branch: $(git branch --show-current)"
echo ""

# Check if build exists
if [ ! -d "build" ]; then
    echo -e "${RED}Error: build/ directory not found!${NC}"
    echo "Run 'npm run build' first"
    exit 1
fi

echo -e "${GREEN}✓ Build directory found ($(du -sh build | cut -f1))${NC}"

# Check build date
BUILD_DATE=$(stat -c %y build/index.html 2>/dev/null || stat -f %Sm build/index.html)
echo "Build date: $BUILD_DATE"
echo ""

# Get server info
if [ -z "$1" ]; then
    echo -e "${YELLOW}Usage: $0 user@beta-server${NC}"
    echo ""
    echo "Example deployment commands:"
    echo ""
    echo "  # Option 1: SCP to server"
    echo "  scp -r build/* user@beta-server:/var/www/beta-explorer/"
    echo ""
    echo "  # Option 2: rsync (recommended)"
    echo "  rsync -avz --delete build/ user@beta-server:/var/www/beta-explorer/"
    echo ""
    echo "  # Option 3: Create archive"
    echo "  tar -czf explorer-beta-$(date +%Y%m%d-%H%M%S).tar.gz build/"
    echo ""
    exit 0
fi

SERVER=$1
REMOTE_PATH=${2:-/var/www/beta-explorer}

echo -e "${YELLOW}Deploying to: $SERVER:$REMOTE_PATH${NC}"
echo ""

# Confirm deployment
read -p "Continue with deployment? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}Deployment cancelled${NC}"
    exit 1
fi

# Create backup on server
echo -e "${GREEN}Creating backup on server...${NC}"
ssh $SERVER "cd $(dirname $REMOTE_PATH) && [ -d $(basename $REMOTE_PATH) ] && mv $(basename $REMOTE_PATH) $(basename $REMOTE_PATH)-backup-$(date +%Y%m%d-%H%M%S) || echo 'No existing deployment to backup'"

# Deploy with rsync
echo -e "${GREEN}Deploying build...${NC}"
rsync -avz --delete --progress build/ $SERVER:$REMOTE_PATH/

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Files deployed successfully${NC}"
else
    echo -e "${RED}✗ Deployment failed!${NC}"
    exit 1
fi

# Set permissions
echo -e "${GREEN}Setting permissions...${NC}"
ssh $SERVER "cd $REMOTE_PATH && sudo chown -R www-data:www-data . && sudo chmod -R 755 ."

# Test deployment
echo -e "${GREEN}Testing deployment...${NC}"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://beta.explorer.accumulatenetwork.io/)

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ Beta site is responding (HTTP $HTTP_CODE)${NC}"
else
    echo -e "${RED}✗ Beta site returned HTTP $HTTP_CODE${NC}"
    echo "Check nginx configuration and logs"
fi

echo ""
echo -e "${GREEN}=== Deployment Complete ===${NC}"
echo ""
echo "Next steps:"
echo "1. Visit: https://beta.explorer.accumulatenetwork.io"
echo "2. Hard refresh: Ctrl+Shift+R (Cmd+Shift+R on Mac)"
echo "3. Open Console (F12) and check for errors"
echo "4. Follow testing checklist in TESTING.md"
echo ""
echo "To rollback:"
echo "  ssh $SERVER 'cd $(dirname $REMOTE_PATH) && rm -rf $(basename $REMOTE_PATH) && mv $(basename $REMOTE_PATH)-backup-* $(basename $REMOTE_PATH)'"
echo ""
