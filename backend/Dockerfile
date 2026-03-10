FROM python:3.9-slim

# Install LibreOffice headless + fonts
RUN apt-get update -qq && \
    apt-get install -y --no-install-recommends \
      libreoffice-writer libreoffice-calc libreoffice-impress \
      fontconfig curl unzip && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Install Google Fonts (Inter + Playfair Display)
RUN mkdir -p /usr/share/fonts/google && \
    curl -sL "https://fonts.google.com/download?family=Inter" -o /tmp/inter.zip && \
    unzip -o /tmp/inter.zip -d /usr/share/fonts/google/inter && \
    curl -sL "https://fonts.google.com/download?family=Playfair+Display" -o /tmp/playfair.zip && \
    unzip -o /tmp/playfair.zip -d /usr/share/fonts/google/playfair && \
    fc-cache -f && \
    rm -f /tmp/inter.zip /tmp/playfair.zip

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
