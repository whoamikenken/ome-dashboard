#!/bin/bash
set -e

# Configuration - Ideally these would be readonly env vars
# JULES_API_KEY should be set in ~/.env or via shell export
JULES_CONFIG_PATH="$HOME/.jules"

echo "--- Starting OME Dashboard Environment Setup ---"

# 1. Validate Joule API Key
if [ -z "$JULES_API_KEY" ]; then
    echo "ERROR: JULES_API_KEY is not set."
    echo "Please export it first or add it to your environment."
    exit 1
fi

# 2. Install Jules CLI (if missing)
if ! command -v jules &> /dev/null; then
    echo "Installing Google Jules CLI..."
    # Example installation logic - adjust based on actual installer path
    curl -sSL https://instructions.google.com/install_jules | bash
else
    echo "Google Jules CLI already installed."
fi

# 3. Setup Frontend Dependencies
if [ -d "frontend" ]; then
    echo "Installing frontend dependencies..."
    cd frontend
    npm install
    cd ..
else
    echo "ERROR: frontend directory not found."
    exit 1
fi

# 4. Verify Repository Registration
echo "Verifying Jules repository registration..."
if jules remote list | grep -q "ome-dashboard"; then
    echo "Repository 'ome-dashboard' is verified in Jules."
else
    echo "Registering 'ome-dashboard' with Jules..."
    jules remote add ome-dashboard .
fi

echo "--- Setup Complete ---"
