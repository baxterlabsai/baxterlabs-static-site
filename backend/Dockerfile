FROM python:3.9-slim

# Install LibreOffice headless + fonts
RUN apt-get update -qq && \
    apt-get install -y --no-install-recommends \
      libreoffice-writer libreoffice-calc libreoffice-impress \
      fontconfig curl unzip debconf && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Install Microsoft core fonts (Arial, Georgia, Times New Roman, etc.) + Liberation fallbacks
# Enable contrib repo for ttf-mscorefonts-installer
RUN sed -i 's/^Components: main$/Components: main contrib/' /etc/apt/sources.list.d/debian.sources 2>/dev/null || \
    echo "deb http://deb.debian.org/debian bookworm contrib" >> /etc/apt/sources.list && \
    echo "ttf-mscorefonts-installer msttcorefonts/accepted-mscorefonts-eula select true" | debconf-set-selections && \
    apt-get update -qq && \
    apt-get install -y --no-install-recommends \
      ttf-mscorefonts-installer \
      fonts-liberation && \
    fc-cache -f -v && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Install Google Fonts (Inter + Playfair Display) from GitHub releases
RUN mkdir -p /usr/share/fonts/google/inter /usr/share/fonts/google/playfair && \
    curl -sL "https://github.com/rsms/inter/releases/download/v4.1/Inter-4.1.zip" -o /tmp/inter.zip && \
    unzip -o /tmp/inter.zip -d /tmp/inter && \
    find /tmp/inter -name '*.ttf' -exec cp {} /usr/share/fonts/google/inter/ \; && \
    curl -sL "https://github.com/clauseggers/Playfair-Display/archive/refs/heads/master.zip" -o /tmp/playfair.zip && \
    unzip -o /tmp/playfair.zip -d /tmp/playfair && \
    find /tmp/playfair -name '*.ttf' -exec cp {} /usr/share/fonts/google/playfair/ \; && \
    fc-cache -f && \
    rm -rf /tmp/inter /tmp/playfair /tmp/inter.zip /tmp/playfair.zip

WORKDIR /app

# Install Python dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY backend/ .

# Render injects $PORT at runtime (default 10000)
ENV PORT=10000
EXPOSE 10000

CMD uvicorn main:app --host 0.0.0.0 --port $PORT
