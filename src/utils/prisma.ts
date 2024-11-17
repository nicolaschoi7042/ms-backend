import { PrismaClient } from "@prisma/client";

let prisma: PrismaClient;

declare global {
  var __db: PrismaClient | undefined;
}

if (!global.__db) {
  global.__db = new PrismaClient();
  // global.__db.$queryRaw`PRAGMA journal_mode = OFF;`
  // .then(() => {
  //   console.log("ENABLED OFF MODE FOR DATABASE");
  // })
  // .catch((err) => {
  //   console.log("DB SETUP FAILED", err);
  //   process.exit(1);
  // });
  global.__db.$queryRaw`PRAGMA busy_timeout = 1000;`
  .then(() => {
    console.log("ENABLED busy_timeout to 1000");
  })
  .catch((err) => {
    console.log("DB SETUP FAILED", err);
    process.exit(1);
  });
  global.__db.$queryRaw`PRAGMA journal_mode = WAL;`
    .then(() => {
      console.log("ENABLED WAL MODE FOR DATABASE");
    })
    .catch((err) => {
      console.log("DB SETUP FAILED", err);
      process.exit(1);
    });
  global.__db.$queryRaw`PRAGMA synchronous = NORMAL;`
    .then(() => {
      console.log("ENABLED synchronous = NORMAL FOR DATABASE");
    })
    .catch((err) => {
      console.log("DB SETUP FAILED", err);
      process.exit(1);
    });
}

prisma = global.__db;

export { prisma };
