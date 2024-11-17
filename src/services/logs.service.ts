import { prisma } from "../utils/prisma";

export async function getWarningAndErrorLogCounts(
  robotId: number,
  startDate: Date,
  endDate: Date
) {
  return prisma.log.count({
    where: {
      robotId,
      AND: [{ createdAt: { gte: startDate } }, { createdAt: { lte: endDate } }],
      OR: [{ level: 1 }, { level: 2 }],
    },
  });
}
