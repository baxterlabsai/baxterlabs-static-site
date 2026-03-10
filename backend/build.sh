#!/usr/bin/env bash
set -o errexit

# Install LibreOffice headless + fonts for PDF conversion
apt-get update -qq
apt-get install -y --no-install-recommends \
  libreoffice-writer libreoffice-calc libreoffice-impress \
  fonts-inter fonts-playfair-display \
  fontconfig
fc-cache -f

# Install Python dependencies
pip install --upgrade pip
pip install -r requirements.txt
