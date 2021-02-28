
# node image
FROM node:15.10.0-alpine3.10
 
# create directory
RUN mkdir -p /usr/src/app
 
# set work directory
WORKDIR /usr/src/app
 
# copy config files
COPY package*.json ./
ADD package.json /usr/src/app/package.json
COPY tsconfig.json ./
ADD tsconfig.json /usr/src/app/tsconfig.json
 
# production mode
# RUN npm install --only=production
RUN npm install --only=production
 
# add source code to the work directory
COPY . .
 
RUN npm install typescript
 
# compile to check any type errors
RUN npx tsc
 
# expose port
EXPOSE 3000
 
 
 
# start the app
ENTRYPOINT [ "npm", "run" ,"start" ]
# CMD ["npm ", "run","start"];
 
# FROM nginx:1.19.7-alpine
# COPY build/ /usr/share/nginx/html
 
 


