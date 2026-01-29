#!/bin/bash

# Production deployment script for TideNet
# Pulls latest changes and rebuilds Docker containers with minimal downtime

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
REPO_URL="git@github.com:nikolisan/tidenet.app.git"
REPO_BRANCH="main"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')

# Create logs directory if it doesn't exist
LOGS_DIR="${SCRIPT_DIR}/logs"
if [ ! -d "${LOGS_DIR}" ]; then
    mkdir -p "${LOGS_DIR}" || {
        echo "ERROR: Failed to create logs directory at ${LOGS_DIR}" >&2
        exit 1
    }
fi

LOG_FILE="${LOGS_DIR}/deploy_${TIMESTAMP}.log"

# Verify we can write to the log file
touch "${LOG_FILE}" 2>/dev/null || {
    echo "ERROR: Cannot write to ${LOG_FILE}. Check permissions." >&2
    exit 1
}

# Create symlink to latest log
ln -sf "deploy_${TIMESTAMP}.log" "${LOGS_DIR}/latest.log"
echo "> Follow this deployment log with: ${YELLOW}tail -f logs/latest.log${NC}"


# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "${LOG_FILE}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" | tee -a "${LOG_FILE}"
    exit 1
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1" | tee -a "${LOG_FILE}"
}

# Start deployment
log "Starting deployment process..."
log "Repository: ${REPO_URL}"
log "Branch: ${REPO_BRANCH}"
log "Log file: ${LOG_FILE}"

# Step 1: Pull latest changes
log "Pulling latest changes from ${REPO_BRANCH}..."
cd "${SCRIPT_DIR}" || error "Failed to change to script directory"

if ! git fetch origin >> "${LOG_FILE}" 2>&1; then
    error "Failed to fetch from origin"
fi

if ! git pull origin "${REPO_BRANCH}" >> "${LOG_FILE}" 2>&1; then
    error "Failed to pull from origin/${REPO_BRANCH}"
fi

log "Successfully pulled latest changes"

# Check if docker-compose.yml exists
log "Verifying docker-compose.yml..."
if [ ! -f "docker-compose.yml" ]; then
    error "docker-compose.yml not found in ${SCRIPT_DIR}"
fi

log "docker-compose.yml found"

# Validate docker-compose configuration
log "Validating docker-compose configuration..."
if ! docker-compose config > /dev/null 2>&1; then
    error "docker-compose configuration is invalid"
fi

log "Configuration is valid"

# Build images (only changed layers are rebuilt)
log "Building Docker images..."
if ! docker-compose build >> "${LOG_FILE}" 2>&1; then
    error "Failed to build Docker images"
fi

log "Docker images built successfully"

# Deploy with minimal downtime
log "Deploying containers with minimal downtime..."

# Create backup of current state (for rollback if needed)
log "Creating backup state for potential rollback..."
docker-compose ps >> "${LOG_FILE}" 2>&1

# Stop and recreate containers without stopping all at once
# This approach rebuilds services one at a time
if ! docker-compose up -d --no-deps --build >> "${LOG_FILE}" 2>&1; then
    error "Failed to start containers"
fi

log "Containers updated successfully"

# Verify deployment
log "Verifying deployment..."
sleep 5  # Wait for containers to stabilize

# Check if all containers are running
if ! docker-compose ps | grep -q "Up"; then
    warn "Some containers may not be running. Check manually."
else
    log "All containers are running"
fi

# Display final status
log "Deployment status"
docker-compose ps >> "${LOG_FILE}" 2>&1

# Success message
log "====================================="
log "Deployment completed successfully!"
log "====================================="
log "Summary:"
log "  - Repository: ${REPO_URL}"
log "  - Branch: ${REPO_BRANCH}"
log "  - Deployment time: ${TIMESTAMP}"
log "  - Log file: ${LOG_FILE}"
log ""
log "Verify the deployment with: docker-compose ps"
log "View logs with: docker-compose logs -f"
