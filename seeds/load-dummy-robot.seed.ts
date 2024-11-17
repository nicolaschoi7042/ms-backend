import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const seedLoadDummyRobot = async () => {
  const robotCount = await prisma.robot.count();

  if (robotCount === 0) {
    // Add a dummy robot entry if the table is empty
    await prisma.robot.create({
      data: {
        project: "STRING",
        application: "",
        platform: "",
        morowVersion: "x.x.x",
        visionVersion: "x.x.x",
        dockerVersion: "x.x.x",
        firmwareVersion: "x.x.x",
        serial: "MOROW00001",
        connection: false,
        status: 2,
        operatingSpeed: 100,
        toolStatus: false,
        eventAlarmCode: 0,
        isCameraCalibration: 1,
        isCameraPositionCalibration: 1,
        isUseBarcode: false,
        isUseAdminPassword: false,
      },
    });
    console.log("add dummy robot to table for testing");
  } else {
    console.log("Robot is already added to db");
  }
};