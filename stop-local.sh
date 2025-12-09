#!/bin/bash
# Stop Local Development Environment

if [ -f ".local-dev.pid" ]; then
    echo "🛑 Stopping local development servers..."
    while read pid; do
        if ps -p $pid > /dev/null 2>&1; then
            kill $pid
            echo "   Stopped process $pid"
        fi
    done < .local-dev.pid
    rm .local-dev.pid
    echo "✅ Local environment stopped"
else
    echo "⚠️  No running servers found (.local-dev.pid not found)"
    echo "Checking for stray processes..."
    pkill -f "uvicorn app.main:app"
    pkill -f "vite"
    echo "✅ Done"
fi
