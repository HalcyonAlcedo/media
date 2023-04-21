FROM node:18.16.0

RUN mkdir -p /home/www/nodeRule
WORKDIR /home/www/nodeRule
RUN apt-get update
RUN apt-get install -y \
    vim \
    wget

COPY . /home/www/nodeRule
RUN yarn
EXPOSE 3000
ENTRYPOINT ["npm", "run"]
CMD ["app"]