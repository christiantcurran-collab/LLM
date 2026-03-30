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

# Copy Python source into standalone output so subprocess can find it
RUN cp -r src/lib .next/standalone/src/lib && \
    cp -r src/data .next/standalone/src/data && \
    cp -r eval .next/standalone/eval

EXPOSE 3000

# Standalone server reads from .next/standalone
CMD ["node", ".next/standalone/server.js"]
