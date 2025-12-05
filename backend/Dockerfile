FROM node:18-alpine
WORKDIR /usr/src/app
RUN apk add --no-cache bash
COPY package.json package-lock.json* ./
RUN npm ci --production
COPY . .
RUN mkdir -p /data
VOLUME [ "/data" ]
ENV DB_FILE=/data/hs.sqlite
ENV PORT=4001
EXPOSE 4001
CMD ["node","server-sqlite.js"]
