import express, { Request, Response, Router } from "express";
// import { prisma } from "../utils/prisma";

const router: Router = express.Router();

import { PrismaClient } from '@prisma/client';
import cron from 'node-cron';

const prisma = new PrismaClient();
const MAX_TABLE_SIZE = 5000000; // Set the maximum table size threshold

async function deleteOldSkuInformation() {
  const tableSize = await prisma.skuInformation.count();
  const threedaysago = new Date();
  threedaysago.setDate(threedaysago.getDate() - 3);
  let deletedCount = await prisma.skuInformation.deleteMany({
    where: {
      createdAt: {
        lt: threedaysago,
      },
    },
  });
  if (tableSize > MAX_TABLE_SIZE) {
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    deletedCount = await prisma.skuInformation.deleteMany({
      where: {
        createdAt: {
          lt: twoDaysAgo,
        },
      },
    });
  }
  console.log('\x1b[31m',`Deleted ${deletedCount.count} rows from the skuInformation table.`);
}

// Schedule the deleteOldSkuInformation function to run every day at 11:30 AM
const skuInfoDeleteScheduler = cron.schedule('30 11 * * *', deleteOldSkuInformation);

deleteOldSkuInformation()

// Start the scheduler
skuInfoDeleteScheduler.start();

// Handle process exit
process.on('SIGINT', () => {
  skuInfoDeleteScheduler.stop();
  prisma.$disconnect();
  process.exit();
});

module.exports = router;