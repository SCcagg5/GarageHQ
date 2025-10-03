#!/bin/sh
set -euo pipefail

############################################
# Script: entrypoint.sh
# Purpose: Prepare configuration and launch Garage WebUI.
#   1. Render /etc/garage.toml from environment variables.
#   2. Start the Garage WebUI process.
#
# Exit Codes:
#   0 - Script executed successfully
#   >0 - Error occurred during setup or launch
#
# Usage:
#   ./entrypoint.sh
############################################

############################################
# Function: render_config_from_env
# Purpose: Generate /etc/garage.toml using environment variables.
#          Requires ADMIN_TOKEN to be set.
############################################
render_config_from_env() {
    : "${ADMIN_TOKEN:?ADMIN_TOKEN is required}"
    cat > /etc/garage.toml <<EOF
[admin]
api_bind_addr = "0.0.0.0:3903"
admin_token = "${ADMIN_TOKEN}"
EOF
    echo "Rendered /etc/garage.toml from environment."
}

############################################
# Function: launch
# Purpose: Start the Garage WebUI binary.
############################################
launch() {
    echo "Starting Garage WebUI on 0.0.0.0:3909..."
    exec /bin/garage-webui
}

############################################
# Main Script Execution
############################################
render_config_from_env
launch
