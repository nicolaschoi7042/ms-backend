import { sumBy } from "lodash";
import { prisma } from "../utils/prisma";

export async function getRobotBySerial(serial: string) {
  return prisma.robot.findUnique({ where: { serial } });
}

export function calculateAverageBph(jobs: any[]) {
  return sumBy(jobs, (job) => job.bph) / jobs.length || 0;
}

export function calculateAverageLoadingRate(jobs: any[]) {
  return sumBy(jobs, (job) => job.loadingRate) / jobs.length || 0;
}
