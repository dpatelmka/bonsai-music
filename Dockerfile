# Bonsai — container image for deploying on Render (or any Docker host).
# This installs the audio tools (ffmpeg + yt-dlp) that the converter needs,
# which a plain Node host doesn't include by default.

FROM node:20-slim

# System tools: ffmpeg (audio conversion), python3 (yt-dlp uses it), curl (to fetch yt-dlp)
RUN apt-get update && apt-get install -y --no-install-recommends \
      ffmpeg python3 ca-certificates curl && \
    curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp \
      -o /usr/local/bin/yt-dlp && \
    chmod a+rx /usr/local/bin/yt-dlp && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Node dependencies first (lets Docker cache this layer)
COPY package*.json ./
RUN npm install --omit=dev

# Copy the rest of the app
COPY . .

# Render sets the PORT environment variable; server.js already reads it.
EXPOSE 10000
CMD ["node", "server.js"]