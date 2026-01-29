#!/bin/bash

# Orchestrate db_scripts: fetch, check, and remove duplicates if found

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Setup logging
LOGS_DIR="$SCRIPT_DIR/logs"
mkdir -p "$LOGS_DIR"
LOG_FILE="$LOGS_DIR/dbupdate_$(date +%Y%m%d_%H%M%S).log"

# Redirect all output to log file and console
exec > >(tee -a "$LOG_FILE")
exec 2>&1

# Remove logs older than 5 days
find "$LOGS_DIR" -name "dbupdate_*.log" -type f -mtime +5 -delete

# Activate virtual environment
if [ -f "$SCRIPT_DIR/.venv/bin/activate" ]; then
    echo "Activating virtual environment..."
    source "$SCRIPT_DIR/.venv/bin/activate"
else
    echo "ERROR: Virtual environment not found at $SCRIPT_DIR/.venv"
    exit 1
fi

# Load environment variables
if [ -f "$SCRIPT_DIR/.env" ]; then
    echo "Loading .env file..."
    export $(cat "$SCRIPT_DIR/.env" | grep -v '#' | xargs)
else
    echo "ERROR: .env file not found at $SCRIPT_DIR/.env"
    exit 1
fi

echo ""
echo "=========================================="
echo "  Database update"
echo "=========================================="
echo "Log file: $LOG_FILE"
echo "=========================================="
echo ""

echo "Fetching latest data..."
echo "----------------------------------------"
python fetch_latest.py
if [ $? -ne 0 ]; then
    echo "ERROR: fetch_latest.py failed"
    exit 1
fi
echo ""

echo "Checking DB for duplicates..."
echo "----------------------------------------"
python check_duplicates.py
DUPLICATES_FOUND=$?

if [ $DUPLICATES_FOUND -eq 0 ]; then
    echo ""
    echo "✓ No duplicates found. Finished."
    echo ""
    exit 0
elif [ $DUPLICATES_FOUND -eq 1 ]; then
    echo ""
    echo "Duplicates found. Removing duplicates..."
    echo "----------------------------------------"
    python remove_duplicates.py
    if [ $? -ne 0 ]; then
        echo "ERROR: remove_duplicates.py failed"
        exit 1
    fi
    
    echo ""
    echo "Verifying duplicates were removed..."
    echo "----------------------------------------"
    python check_duplicates.py
    if [ $? -eq 0 ]; then
        echo ""
        echo "✓ All duplicates removed. Finished."
        echo ""
        exit 0
    else
        echo ""
        echo "ERROR: Duplicates still exist after removal"
        exit 1
    fi
else
    echo "ERROR: check_duplicates.py failed"
    exit 1
fi
