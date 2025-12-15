#!/bin/bash
# Automated build and deploy script for Ontime to Raspberry Pi

set -e

# Configuration
PI_IP="192.168.50.220"
PI_USER="pi"
PI_PATH="/tmp/ontime-deploy"
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="/tmp/ontime-deploy"

# SSH command - will prompt for password if needed
SSH_CMD="ssh"
SCP_CMD="scp"

# Check if sshpass is available (for password automation)
if command -v sshpass &> /dev/null; then
    echo "Note: sshpass detected. You can set PI_PASSWORD environment variable to automate password entry."
    if [ -n "$PI_PASSWORD" ]; then
        SSH_CMD="sshpass -p '$PI_PASSWORD' ssh -o StrictHostKeyChecking=no"
        SCP_CMD="sshpass -p '$PI_PASSWORD' scp -o StrictHostKeyChecking=no"
    fi
fi

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Ontime Build and Deploy Script ===${NC}"
echo ""

# Step 1: Clean previous builds
echo -e "${YELLOW}Step 1: Cleaning previous builds...${NC}"
cd "$PROJECT_DIR"
echo "  Removing old build directories..."
rm -rf apps/client/build
rm -rf apps/server/dist
rm -rf "$DEPLOY_DIR"
echo "  Cleaning node_modules/.vite cache..."
rm -rf apps/client/node_modules/.vite 2>/dev/null || true
echo -e "${GREEN}✓ Cleaned${NC}"
echo ""

# Step 2: Build
echo -e "${YELLOW}Step 2: Building application...${NC}"
NODE_ENV=docker pnpm build

if [ ! -f "apps/server/dist/docker.cjs" ]; then
    echo -e "${RED}✗ Build failed - docker.cjs not found${NC}"
    exit 1
fi

if [ ! -f "apps/client/build/index.html" ]; then
    echo -e "${RED}✗ Build failed - index.html not found${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Build complete${NC}"
echo ""

# Step 3: Package
echo -e "${YELLOW}Step 3: Packaging deployment...${NC}"
mkdir -p "$DEPLOY_DIR/server"
cp -r apps/server/dist/* "$DEPLOY_DIR/server/"
mkdir -p "$DEPLOY_DIR/server/client"
cp -r apps/client/build/* "$DEPLOY_DIR/server/client/"
cp -r apps/server/src/external "$DEPLOY_DIR/server/"
cp -r apps/server/src/user "$DEPLOY_DIR/server/"
cp -r apps/server/src/html "$DEPLOY_DIR/server/"

# Verify package
if [ ! -f "$DEPLOY_DIR/server/docker.cjs" ] || [ ! -f "$DEPLOY_DIR/server/client/index.html" ]; then
    echo -e "${RED}✗ Packaging failed${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Package ready${NC}"
echo ""

# Step 4: Create tarball
echo -e "${YELLOW}Step 4: Creating deployment archive...${NC}"
cd "$DEPLOY_DIR"
tar czf ontime-server.tar.gz server/
SIZE=$(du -h ontime-server.tar.gz | cut -f1)
echo -e "${GREEN}✓ Archive created (${SIZE})${NC}"
echo ""

# Step 5: Transfer to Pi
echo -e "${YELLOW}Step 5: Transferring to Raspberry Pi...${NC}"
echo "This may take a minute..."
echo "You may be prompted for your Pi password..."
eval "$SCP_CMD" ontime-server.tar.gz "${PI_USER}@${PI_IP}:/tmp/" || {
    echo -e "${RED}✗ Transfer failed. Check:${NC}"
    echo "  - Pi is reachable at ${PI_IP}"
    echo "  - Username is correct: ${PI_USER}"
    echo "  - Password is correct"
    exit 1
}
echo -e "${GREEN}✓ Transfer complete${NC}"
echo ""

# Step 6: Deploy on Pi
echo -e "${YELLOW}Step 6: Deploying on Raspberry Pi...${NC}"
echo "You may be prompted for your Pi password again..."
eval "$SSH_CMD" "${PI_USER}@${PI_IP}" << 'ENDSSH'
set -e

echo "Stopping service..."
sudo systemctl stop ontime 2>/dev/null || true

echo "Backing up old installation..."
if [ -d /opt/ontime/server ]; then
    sudo mv /opt/ontime/server /opt/ontime/server.backup.$(date +%s) 2>/dev/null || true
fi

echo "Cleaning up old files..."
cd /tmp
rm -rf server
# Keep only last 3 backups on Pi
ls -t /opt/ontime/server.backup.* 2>/dev/null | tail -n +4 | xargs sudo rm -rf 2>/dev/null || true

echo "Extracting new build..."
tar xzf ontime-server.tar.gz

echo "Verifying extracted files..."
if [ ! -f server/docker.cjs ] || [ ! -f server/client/index.html ]; then
    echo "ERROR: Extracted files are incomplete!"
    exit 1
fi

echo "Installing..."
sudo mkdir -p /opt/ontime
sudo rm -rf /opt/ontime/server
sudo mv server /opt/ontime/server
sudo chown -R pi:pi /opt/ontime
sudo chmod +x /opt/ontime/server/docker.cjs

echo "Getting Node.js path..."
NODE_PATH=$(which node)
echo "Node.js at: $NODE_PATH"

echo "Updating service file..."
sudo tee /etc/systemd/system/ontime.service > /dev/null <<EOF
[Unit]
Description=Ontime - Time keeping for live events
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/opt/ontime/server
Environment="NODE_ENV=production"
Environment="ONTIME_DATA=/var/lib/ontime/"
ExecStart=$NODE_PATH /opt/ontime/server/docker.cjs
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

echo "Creating data directory..."
sudo mkdir -p /var/lib/ontime
sudo chown pi:pi /var/lib/ontime

echo "Starting service..."
sudo systemctl daemon-reload
sudo systemctl enable ontime.service
sudo systemctl start ontime.service

echo "Waiting for service to start..."
sleep 3

if sudo systemctl is-active --quiet ontime; then
    echo "✓ Service is running"
    echo ""
    echo "Recent logs:"
    sudo journalctl -u ontime.service -n 8 --no-pager | grep -E "(Starting|Request:|Local:|Network:)" || sudo journalctl -u ontime.service -n 8 --no-pager
else
    echo "✗ Service failed to start"
    echo "Error logs:"
    sudo journalctl -u ontime.service -n 20 --no-pager
    exit 1
fi
ENDSSH

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}=== Deployment Complete! ===${NC}"
    echo ""
    echo "Access Ontime at:"
    echo -e "${GREEN}http://${PI_IP}:4001/editor${NC}"
    echo ""
    echo "To view logs:"
    echo "ssh ${PI_USER}@${PI_IP} 'sudo journalctl -u ontime.service -f'"
    echo ""
    echo "Tip: To avoid password prompts, set up SSH keys:"
    echo "  ssh-copy-id ${PI_USER}@${PI_IP}"
    echo "Or set PI_PASSWORD environment variable and install sshpass:"
    echo "  brew install hudochenkov/sshpass/sshpass  # macOS"
    echo "  export PI_PASSWORD='your-pi-password'"
else
    echo -e "${RED}✗ Deployment failed${NC}"
    exit 1
fi
