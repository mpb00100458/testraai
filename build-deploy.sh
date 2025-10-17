#!/bin/bash
set -e

echo "Building frontend and backend..."
npm run build

echo "Installing Playwright browsers for production..."
npx playwright install --with-deps chromium

echo "Build complete!"
