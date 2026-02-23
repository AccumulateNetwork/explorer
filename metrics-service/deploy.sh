#!/bin/bash
# Deploy Accumulate Metrics Service to server1

set -e

SERVER="dal-server1"
DEPLOY_DIR="/opt/accumulate-metrics"
SERVICE_NAME="accumulate-metrics"

echo "=== Building metrics service ==="
go mod download
GOOS=linux GOARCH=amd64 go build -o metrics-service

echo "=== Deploying to $SERVER ==="

# Create accumulate user if it doesn't exist
ssh $SERVER "id accumulate >/dev/null 2>&1 || sudo useradd -r -s /bin/false -d $DEPLOY_DIR accumulate"

# Create deployment directory on server
ssh $SERVER "sudo mkdir -p $DEPLOY_DIR"

# Copy binary to /tmp first, then move with sudo
scp metrics-service $SERVER:/tmp/metrics-service-new
scp README.md $SERVER:/tmp/README-new.md
ssh $SERVER "sudo mv /tmp/metrics-service-new $DEPLOY_DIR/metrics-service && \
             sudo mv /tmp/README-new.md $DEPLOY_DIR/README.md && \
             sudo chmod +x $DEPLOY_DIR/metrics-service && \
             sudo chown -R accumulate:accumulate $DEPLOY_DIR"

# Create systemd service file
cat > accumulate-metrics.service << 'EOF'
[Unit]
Description=Accumulate Metrics API
After=network.target

[Service]
Type=simple
User=accumulate
WorkingDirectory=/opt/accumulate-metrics
ExecStart=/opt/accumulate-metrics/metrics-service
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# Deploy systemd service
scp accumulate-metrics.service $SERVER:/tmp/
ssh $SERVER "sudo mv /tmp/accumulate-metrics.service /etc/systemd/system/ && \
             sudo systemctl daemon-reload && \
             sudo systemctl enable $SERVICE_NAME && \
             sudo systemctl restart $SERVICE_NAME && \
             sudo systemctl status $SERVICE_NAME"

echo "=== Deployment complete ==="
echo "Service is running on $SERVER:8080"
echo ""
echo "To check status:"
echo "  ssh $SERVER sudo systemctl status $SERVICE_NAME"
echo ""
echo "To view logs:"
echo "  ssh $SERVER sudo journalctl -u $SERVICE_NAME -f"
echo ""
echo "To test:"
echo "  curl http://$SERVER:8080/v1/supply"
