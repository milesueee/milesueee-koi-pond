# Stage 1: Build production bundle with Node.js
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies using layer cache
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build static distribution
COPY . .
RUN npm run build

# Stage 2: Serve static files with lightweight Nginx
FROM nginx:alpine AS runner

# Custom Nginx configuration with SPA routing and PWA caching rules
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
