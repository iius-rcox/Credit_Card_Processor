#!/bin/bash
set -e

echo "🚀 Starting Credit Card Processor Frontend..."
echo "📍 Working directory: $(pwd)"
echo "👤 Running as: $(whoami)"
echo "🔧 Node version: $(node --version)"
echo "📦 NPM version: $(npm --version)"
echo "🛤️  PATH: $PATH"

# Verify dependencies
echo "🔍 Checking critical dependencies..."

# Check if vite exists
if command -v vite &> /dev/null; then
    echo "✅ Vite found at: $(which vite)"
else
    echo "❌ Vite not found in PATH"
    
    # Try to find vite in common locations
    if [ -f "./node_modules/.bin/vite" ]; then
        echo "🔧 Found vite at ./node_modules/.bin/vite"
        export PATH="$(pwd)/node_modules/.bin:$PATH"
        echo "✅ Updated PATH: $PATH"
    else
        echo "❌ Vite binary not found anywhere"
        echo "🔄 Attempting to reinstall vite..."
        npm install vite --save-dev || echo "❌ Failed to install vite"
    fi
fi

# Check if package.json exists
if [ ! -f "package.json" ]; then
    echo "❌ package.json not found!"
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "❌ node_modules directory not found!"
    echo "🔄 Running npm install..."
    npm install
fi

# List .bin directory for debugging
echo "📂 Contents of node_modules/.bin/:"
ls -la node_modules/.bin/ 2>/dev/null || echo "❌ .bin directory not found"

# Final vite check
echo "🔍 Final vite check..."
if command -v vite &> /dev/null; then
    echo "✅ Vite is ready!"
    vite --version
else
    echo "❌ Vite still not available"
    echo "🔄 Trying npx vite..."
fi

echo "🎯 Starting development server..."

# Execute the passed command
exec "$@"