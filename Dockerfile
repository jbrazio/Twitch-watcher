FROM node:14-alpine3.14
LABEL maintainer="D3v <info@zsmark.dev>"

RUN apk add --no-cache chromium nss freetype freetype-dev harfbuzz ca-certificates ttf-freefont dumb-init

WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci --production
COPY . .

USER node
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["npm","start"]
