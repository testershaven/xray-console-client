FROM node:18-alpine

ENV NODE_ENV=production
WORKDIR /app

COPY .  .

RUN mkdir /app/tests
RUN mkdir /app/executions

RUN npm install

ENTRYPOINT ["tail", "-f", "/dev/null"]