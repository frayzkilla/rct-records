FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

RUN mkdir -p /app/storage/artists_images \
    && mkdir -p /app/storage/tracks \
    && mkdir -p /app/storage/covers \
    && mkdir -p /app/storage/albums \
    && chmod -R 777 /app/storage

CMD ["npm", "run", "start:prod"]