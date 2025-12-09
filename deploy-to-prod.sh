#!/bin/bash
# Deploy to Production
# Runs local tests, commits, pushes, and waits for deployment

set -e

echo "🚀 Deploying to Production..."
echo ""

# Run tests first
echo "Step 1: Running local tests..."
./local-test.sh

echo ""
echo "Step 2: Commit and push changes..."
echo ""

# Check if there are changes
if [ -z "$(git status --porcelain)" ]; then
    echo "⚠️  No changes to commit"
    exit 0
fi

# Show changes
echo "📝 Changes to commit:"
git status --short
echo ""

# Prompt for commit message if not provided
if [ -z "$1" ]; then
    echo "Enter commit message:"
    read -r COMMIT_MSG
else
    COMMIT_MSG="$1"
fi

# Commit and push
git add -A
git commit -m "$COMMIT_MSG"
git push origin main

echo ""
echo "Step 3: Waiting for GitHub Actions..."
sleep 10

# Check latest run status
gh run list --limit 1

echo ""
echo "Step 4: Waiting for deployment (45 seconds)..."
sleep 45

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🌐 Check your site: https://workshelf.dev"
echo "📊 CI Status: gh run list --limit 1"
echo "📋 Logs: gh run view --log"
