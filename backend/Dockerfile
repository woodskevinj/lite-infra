FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

FROM alpine:3.20
RUN apk add --no-cache nodejs
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY . .
USER nobody
EXPOSE 3001
CMD ["node", "server.js"]
