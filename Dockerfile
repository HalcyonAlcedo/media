FROM node:18.16.0

RUN mkdir -p /home/www/nodeRule
WORKDIR /home/www/nodeRule
RUN apt-get update \
    && apt-get install -y wget gnupg ffmpeg build-essential fonts-noto-color-emoji \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
      --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

COPY . /home/www/nodeRule
RUN yarn
EXPOSE 3000
ENTRYPOINT ["npm", "run"]
CMD ["app"]