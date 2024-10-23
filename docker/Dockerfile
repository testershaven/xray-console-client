FROM node:20.18.0-alpine

ENV NODE_ENV=production
WORKDIR /app

COPY .  .

RUN mkdir /app/tests
RUN mkdir /app/executions

RUN npm install

ENTRYPOINT ["tail", "-f", "/dev/null"]