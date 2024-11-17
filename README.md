프로젝트 설정하기
execute setup.sh file for install node and npm via nvm

# insert below line to .bashrc
[[ -s $HOME/.nvm/nvm.sh ]] && . $HOME/.nvm/nvm.sh  # This loads NVM

프로젝트에 필요한 패키지들을 설치합니다:
yarn install
    (Note: 현재 프로젝트는 npm 대신 yarn을 사용하고 있습니다.)

Nodemon 설치하기
코드를 변경하면 nodemon이 자동으로 서버를 재시작하여 변경 사항을 반영합니다.

전역으로 설치하기:
npm install -g nodemon
프로젝트 내부에 설치하기:
npm install --save-dev nodemon
서버 실행하기
개발 모드로 api 서버를 작동시키려면 아래 명령어를 실행시켜 주세요:
yarn dev
DB에 있는 모든 내용을 지우려면 아래 명령어를 실행시켜 주세요:
yarn reset:db
테스트를 위한 더미데이터를 DB에 생성시키려면 아래 명령어를 실행시켜 주세요:
yarn seed:reset
프로덕션 모드로 api 서버를 작동시키기 위해서는 일단 빌드를 먼저 해야 합니다:
yarn build
그다음에는 서버를 실행시켜주세요:
yarn start
환경 설정하기
프로젝트 루트 경로에 robot-api/.env 파일을 생성하고, 데이터베이스 URL을 설정해야 합니다:

DATABASE_URL="file:./data/mydb.sqlite"
포트 설정하기
포트번호를 변경하려면 robot-api/.env 파일 안에 아래와 같이 지정해주시면 됩니다:

PORT=6412
위 예시처럼 작성하면 서버는 포트번호 6412에 실행되게 됩니다. 만약 아무 설정을 하지 않는다면 기본적으로 8000포트로 시작됩니다.

Prisma 사용하기
현재 ORM은 Prisma를 사용하고 있습니다. 아래 명령어를 실행하면 현재 DB 정보를 localhost:5555에서 쉽게 볼 수 있습니다:

yarn prisma studio