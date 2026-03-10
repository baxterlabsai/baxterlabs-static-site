FROM python:3.9-slim

# Install LibreOffice headless + fonts
RUN apt-get update -qq && \
    apt-get install -y --no-install-recommends \
      libreoffice-writer libreoffice-calc libreoffice-impress \
      fontconfig curl unzip && \
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
