# Stage 1: Compile brotli nginx module
FROM nginx:alpine AS brotli-builder

RUN apk add --no-cache \
    gcc g++ libc-dev make pcre2-dev openssl-dev zlib-dev linux-headers cmake git && \
    NGINX_VERSION=$(nginx -v 2>&1 | sed 's/.*nginx\///') && \
    echo "Building brotli module for nginx ${NGINX_VERSION}" && \
    git clone --recurse-submodules --depth 1 https://github.com/google/ngx_brotli.git /tmp/ngx_brotli && \
    cd /tmp/ngx_brotli/deps/brotli && mkdir out && cd out && \
    cmake -DCMAKE_BUILD_TYPE=Release -DBUILD_SHARED_LIBS=OFF -DBUILD_TESTING=OFF .. && \
    cmake --build . --config Release --target brotlienc && \
    cd /tmp && \
    wget -q https://nginx.org/download/nginx-${NGINX_VERSION}.tar.gz && \
    tar xzf nginx-${NGINX_VERSION}.tar.gz && \
    cd nginx-${NGINX_VERSION} && \
    ./configure --with-compat --add-dynamic-module=/tmp/ngx_brotli && \
    make modules

# Stage 2: Build application
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application (generates .gz and .br pre-compressed files)
RUN npm run build

# Stage 3: Production
FROM nginx:alpine

# Copy brotli modules from builder
COPY --from=brotli-builder /tmp/nginx-*/objs/ngx_http_brotli_filter_module.so /etc/nginx/modules/
COPY --from=brotli-builder /tmp/nginx-*/objs/ngx_http_brotli_static_module.so /etc/nginx/modules/

# Load brotli modules in main nginx config
RUN sed -i '1i load_module modules/ngx_http_brotli_filter_module.so;\nload_module modules/ngx_http_brotli_static_module.so;' /etc/nginx/nginx.conf

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Run as non-root user for security
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    touch /var/run/nginx.pid && chown nginx:nginx /var/run/nginx.pid

USER nginx

# Expose port 80
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:80/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
