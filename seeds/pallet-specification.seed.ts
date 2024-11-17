import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const OVERHANG_LIST = [undefined, 100, 200, 300, 400, 500];

export const seedPalletSpecifications = async () => {
  const robot = await prisma.robot.findFirst({});
  if (!robot) {
    console.error("No robot found");
    return;
  }
  await prisma.palletSpecification.deleteMany({});
  await prisma.palletSpecification.create({
    data: {
      name: "11A",
      length: 1100,
      width: 1100,
      height: 150,
      overhang: OVERHANG_LIST[Math.floor(Math.random() * OVERHANG_LIST.length)],
      robotId: robot.id,
    },
  });
  await prisma.palletSpecification.create({
    data: {
      name: "12A",
      length: 1200,
      width: 1100,
      height: 150,
      overhang: OVERHANG_LIST[Math.floor(Math.random() * OVERHANG_LIST.length)],
      robotId: robot.id,
    },
  });

  await prisma.palletSpecification.create({
    data: {
      name: "13B",
      length: 1300,
      width: 1100,
      height: 150,
      overhang: OVERHANG_LIST[Math.floor(Math.random() * OVERHANG_LIST.length)],
      robotId: robot.id,
    },
  });
  await prisma.palletSpecification.create({
    data: {
      name: "15A",
      length: 1460,
      width: 1130,
      height: 150,
      overhang: OVERHANG_LIST[Math.floor(Math.random() * OVERHANG_LIST.length)],
      robotId: robot.id,
    },
  });
};
