#!/bin/bash
# Monitor Terraform deployment progress

LOG_FILE="/Users/kit/Library/Mobile Documents/com~apple~CloudDocs/PROJECTS NEW/Shared Thread/work-shelf/infrastructure/terraform/terraform-deploy.log"

echo "🔍 Monitoring Terraform Deployment..."
echo "📝 Log file: terraform-deploy.log"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

while true; do
    clear
    echo "🚀 AWS Infrastructure Deployment - Live Monitor"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "⏰ $(date '+%H:%M:%S')"
    echo ""
    
    if [ -f "$LOG_FILE" ]; then
        # Show last 25 lines
        tail -25 "$LOG_FILE"
        
        # Check for completion
        if grep -q "Apply complete!" "$LOG_FILE"; then
            echo ""
            echo "✅ DEPLOYMENT COMPLETE!"
            break
        fi
        
        # Check for errors
        if grep -q "Error:" "$LOG_FILE" | tail -5; then
            echo ""
            echo "⚠️  Errors detected - check log for details"
        fi
    else
        echo "⏳ Waiting for deployment to start..."
    fi
    
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Press Ctrl+C to stop monitoring (deployment continues in background)"
    
    sleep 10
done
