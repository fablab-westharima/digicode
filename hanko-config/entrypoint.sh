#!/bin/sh
set -e

echo "Running Hanko database migrations..."
hanko migrate up --config /etc/hanko/config.yaml

echo "Starting Hanko server..."
exec hanko serve public --config /etc/hanko/config.yaml
