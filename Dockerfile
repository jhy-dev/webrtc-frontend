
# docker build -t asia.gcr.io/synergy-249605/pvms-front .
# docker run -p 3000:3000 -d asia.gcr.io/synergy-249605/pvms-front


FROM node:12 as builder
# 작업 폴더를 만들고 npm 설치
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app
COPY package.json /usr/src/app/package.json
COPY tsconfig.json /usr/src/app/tsconfig.json
# 소스를 작업폴더로 복사하고 빌드
COPY . /usr/src/app

# type error check
RUN npx tsc

RUN npm run build

FROM nginx:1.19.7-alpine
# nginx의 기본 설정을 삭제하고 앱에서 설정한 파일을 복사
RUN rm -rf /etc/nginx/conf.d
COPY conf /etc/nginx
# 위에서 생성한 앱의 빌드산출물을 nginx의 샘플 앱이 사용하던 폴더로 이동
COPY --from=builder /usr/src/app/build /usr/share/nginx/html
# 80포트 오픈하고 nginx 실행
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]


# # node image
# FROM node:15.10.0-alpine3.10

# # create directory
# RUN mkdir -p /usr/src/app

# # set work directory
# WORKDIR /usr/src/app

# # copy config files
# COPY package*.json ./
# ADD package.json /usr/src/app/package.json
# COPY tsconfig.json ./
# ADD tsconfig.json /usr/src/app/tsconfig.json

# # production mode
# RUN npm install --only=production

# # add source code to the work directory
# COPY . .

# # compile to check any type errors
# RUN npx tsc

# # expose port
# EXPOSE 3000

# # start the app
# CMD ["npm ","start"];

# # FROM nginx:1.19.7-alpine
# # COPY build/ /usr/share/nginx/html

