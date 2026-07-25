# ---------- Base Image ----------
FROM node:20-alpine

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev

# Copy project
COPY . .

# Environment
ENV NODE_ENV=production

# Expose application port
EXPOSE 3000

# Start application
CMD ["npm", "start"]