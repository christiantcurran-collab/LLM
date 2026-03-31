FROM node:20-slim

# Install Python 3 + pip
RUN apt-get update && apt-get install -y python3 python3-pip python3-venv && \
    ln -sf /usr/bin/python3 /usr/bin/python && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip3 install --no-cache-dir --break-system-packages --root-user-action=ignore -r requirements.txt

# Install Node dependencies
COPY package.json package-lock.json* ./
RUN npm install

# Copy source
COPY . .

# Build Next.js (standalone output)
RUN npm run build

# Copy static assets into standalone (Next.js requires this)
RUN cp -r .next/static .next/standalone/.next/static

EXPOSE 3000

# Run standalone server from /app so process.cwd() finds src/, eval/, scripts/
CMD ["node", ".next/standalone/server.js"]
