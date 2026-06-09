
if [ -d "frontend" ]; then
    echo "Installing frontend dependencies..."
    cd frontend
    npm install
    cd ..
else
    echo "ERROR: frontend directory not found."
    exit 1
fi

echo "Verifying Jules repository registration..."
if jules remote list | grep -q "ome-dashboard"; then
    echo "Repository 'ome-dashboard' is verified in Jules."
else
    echo "Registering 'ome-dashboard' with Jules..."
    jules remote add ome-dashboard .
fi

echo "--- Setup Complete ---"
