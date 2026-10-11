# Frontend Static Web Server for Circo
FROM nginx:1.27-alpine

ARG BUILD_NUMBER=dev
ENV BUILD_NUMBER=${BUILD_NUMBER}

# Copy frontend source files
COPY src /usr/share/nginx/html

# Bake build number directly into index.html
RUN sed -i "s/__BUILD_NUMBER__/${BUILD_NUMBER}/g" /usr/share/nginx/html/index.html

EXPOSE 80

HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
