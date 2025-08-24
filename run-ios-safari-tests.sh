#!/bin/bash

echo "🧪 Running iOS Safari Tests with WebKit (visible browser)"
echo "==========================================="
echo ""

# Run simple iOS tests
echo "📱 Testing iPhone 13 and iPad Pro viewports..."
pnpm exec playwright test ios-simple.spec.ts --project="Mobile Safari" --headed --reporter=list --workers=1

# Run PWA installation tests
echo ""
echo "📦 Testing PWA meta tags and installation features..."
pnpm exec playwright test ios-pwa.spec.ts:5:48 --project="Mobile Safari" --headed --reporter=list --workers=1

# Run authentication tests
echo ""
echo "🔐 Testing authentication on mobile Safari..."
pnpm exec playwright test ios-auth.spec.ts:5:31 --project="Mobile Safari" --headed --reporter=list --workers=1

echo ""
echo "✅ iOS Safari testing complete!"