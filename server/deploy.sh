#!/bin/bash
# Deploy CorpSim v0.4.0 to Railway/Render

set -e

echo "🚀 CorpSim v0.4.0 Deployment Script"
echo "===================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: Please run this script from corpsim-v3/server directory${NC}"
    exit 1
fi

echo "Step 1: Building the project..."
npm run build

echo ""
echo "Step 2: Preparing deployment files..."

# Create a production package.json
cat > package.production.json << 'PROD_PKG'
{
  "name": "corpsim-server",
  "version": "0.4.0",
  "description": "CorpSim Multi-Agent Boardroom Server",
  "main": "dist/server.js",
  "scripts": {
    "start": "node dist/server.js",
    "build": "tsc"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "ws": "^8.14.2",
    "uuid": "^9.0.1",
    "pg": "^8.11.3"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
PROD_PKG

echo ""
echo -e "${YELLOW}Choose deployment platform:${NC}"
echo "1) Railway (Recommended)"
echo "2) Render"
echo "3) Fly.io"
echo "4) Manual Docker"
read -p "Enter choice (1-4): " choice

case $choice in
    1)
        echo ""
        echo "Deploying to Railway..."
        echo ""
        echo "Please ensure you have:"
        echo "  1. Railway CLI installed: npm install -g @railway/cli"
        echo "  2. Logged in: railway login"
        echo ""
        read -p "Press Enter when ready..."
        
        # Create railway project if not exists
        if ! railway status &> /dev/null; then
            echo "Initializing Railway project..."
            railway init
        fi
        
        # Add PostgreSQL plugin
        echo "Adding PostgreSQL database..."
        railway add --plugin postgresql
        
        # Deploy
        echo "Deploying..."
        railway up
        
        # Get domain
        echo ""
        echo -e "${GREEN}Deployment complete!${NC}"
        railway domain
        ;;
        
    2)
        echo ""
        echo "Deploying to Render..."
        echo ""
        echo "Please:"
        echo "  1. Go to https://render.com"
        echo "  2. Create a new Web Service"
        echo "  3. Connect your GitHub repo"
        echo "  4. Use these settings:"
        echo "     - Root Directory: corpsim-v3/server"
        echo "     - Build Command: npm install && npm run build"
        echo "     - Start Command: node dist/server.js"
        echo ""
        echo -e "${YELLOW}Create a PostgreSQL database on Render and set DATABASE_URL${NC}"
        ;;
        
    3)
        echo ""
        echo "Deploying to Fly.io..."
        echo ""
        
        if ! command -v flyctl &> /dev/null; then
            echo "Installing Fly CLI..."
            curl -L https://fly.io/install.sh | sh
        fi
        
        # Initialize if needed
        if [ ! -f "fly.toml" ]; then
            flyctl launch --no-deploy
        fi
        
        # Create postgres
        echo "Creating PostgreSQL database..."
        flyctl postgres create --name corpsim-db
        
        # Attach db
        flyctl postgres attach corpsim-db
        
        # Deploy
        flyctl deploy
        
        echo -e "${GREEN}Deployment complete!${NC}"
        flyctl status
        ;;
        
    4)
        echo ""
        echo "Building Docker image..."
        
        # Build
        docker build -t corpsim-server:0.4.0 .
        
        echo ""
        echo "To run locally:"
        echo "  docker run -p 3004:3004 corpsim-server:0.4.0"
        echo ""
        echo "To deploy to your own server:"
        echo "  docker tag corpsim-server:0.4.0 your-registry/corpsim-server:0.4.0"
        echo "  docker push your-registry/corpsim-server:0.4.0"
        ;;
        
    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}====================================${NC}"
echo -e "${GREEN}Deployment process complete!${NC}"
echo -e "${GREEN}====================================${NC}"
echo ""
echo "Next steps:"
echo "  1. Note your deployment URL"
echo "  2. Update CORPSIM_URL environment variable"
echo "  3. Share the URL with other players"
echo ""
echo "Example:"
echo "  export CORPSIM_URL=https://your-app.railway.app"
echo "  corpsim list"
