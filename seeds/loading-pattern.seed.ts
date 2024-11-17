import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const seedLoadingPatterns = async () => {
  await prisma.loadingPattern.deleteMany({});
  await prisma.loadingPattern.createMany({
    data: [
      { name: "iherb_B_C", boxGroup: "iherb" },
      { name: "iherb_D_H", boxGroup: "iherb" },
      { name: "iherb_D", boxGroup: "iherb" },
      { name: "iherb_F", boxGroup: "iherb" },
      { name: "iherb_G", boxGroup: "iherb" },
      { name: "iherb_buffer", boxGroup: "iherb" },
      { name: "iherb_error", boxGroup: "iherb" },
      { name: "unicity_1", boxGroup: "unicity" },
      { name: "unicity_6", boxGroup: "unicity" },
      { name: "usana_1", boxGroup: "usana" },
      { name: "usana_2", boxGroup: "usana" },
      { name: "ktl", boxGroup: "ktl" },
    ],
  });
};