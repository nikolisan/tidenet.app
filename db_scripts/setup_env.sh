#!/bin/bash

# Setup local environment for db_scripts

echo "Creating virtual environment..."
python -m venv .venv

echo "Activating virtual environment..."
source .venv/bin/activate

echo "Installing dependencies..."
pip install --upgrade pip
pip install sqlalchemy[asyncio] aiohttp pendulum psycopg[binary] tqdm

echo ""
echo "✓ Environment setup complete!"
echo ""
echo "To activate the environment, run:"
echo "  source .venv/bin/activate"
echo ""
echo "To run scripts:"
echo "  python fetch_latest.py"
echo "  python check_duplicates.py"
echo "  python remove_duplicates.py"
echo "  python add_constraint.py"
