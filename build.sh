#!/bin/sh
echo "[Shutdown current backend process]"
./backend_stop.sh

echo "[BUILDING & INSTALLING ROBOT-API]"
pm2 delete all
rm -rf dist/ node_modules/
pnpm install
pnpm build

echo "[UPDATING DATABASE]"
npx prisma migrate dev --name edit
pnpm seed
