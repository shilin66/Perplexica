FROM node:20.18.0-alpine

WORKDIR /home/perplexica

COPY ui /home/perplexica/

RUN yarn install
RUN yarn build

CMD ["yarn", "start"]