import { PrismaClient } from "@prisma/client";
import { seedBarcodeTypes } from "./barcode-types.seed";
import { seedBoxGroups } from "./box-group.seed";
import { seedLoadingPatterns } from "./loading-pattern.seed";
import { seedLoadDummyRobot } from "./load-dummy-robot.seed";
import { seedPalletSpecifications } from "./pallet-specification.seed";

const prisma = new PrismaClient();

async function main() {
  await seedLoadDummyRobot();
  await seedLoadingPatterns();
  // await seedBarcodeTypes();
  // await seedBoxGroups();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
