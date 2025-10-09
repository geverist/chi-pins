#!/bin/bash
# Deploy update to kiosks via self-hosted OTA
# This creates a bundle and deploys it to your web server

set -e

echo "🔨 Building app..."
npm run build

echo "📦 Creating update bundle..."
VERSION=$(date +%Y%m%d%H%M%S)
BUNDLE_DIR="dist-updates/$VERSION"
mkdir -p "$BUNDLE_DIR"

# Copy dist to bundle
cp -r dist/* "$BUNDLE_DIR/"

# Create manifest
cat > "$BUNDLE_DIR/update.json" << EOF
{
  "version": "$VERSION",
  "url": "https://YOUR_SERVER_URL/updates/$VERSION",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF

echo "✅ Update bundle created: $BUNDLE_DIR"
echo ""
echo "📤 To deploy:"
echo "1. Upload $BUNDLE_DIR to your web server at /updates/$VERSION/"
echo "2. Update latest.json to point to this version"
echo ""
echo "Or run: scp -r $BUNDLE_DIR user@yourserver:/var/www/updates/"
