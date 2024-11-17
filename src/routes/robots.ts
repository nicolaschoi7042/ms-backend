import express, { Request, Response, Router } from "express";
import { body, param, query, validationResult } from "express-validator";
import {
  EventAlarmCode,
  RobotLiftPosition,
  RobotPosition,
  RobotStatus,
  SenderId,
  rosCommandCode,
  BOX_INSP_CD
} from "../constants/robotConstants";
import { format, sub as subtract } from "date-fns";
import { chain, find } from "lodash";
import {
  calculateAverageBph,
  calculateAverageLoadingRate,
  getRobotBySerial,
} from "../services/robots.service";
import {
  getJobsGroupedByEndDate,
  getJobsForRobotOnDate,
} from "../services/jobs.service";
import { getWarningAndErrorLogCounts } from "../services/logs.service";
import { stringify } from "csv-stringify";
import { Level } from "../constants/logConstants";
import { hashSync } from "bcryptjs";
import { prisma } from "../utils/prisma";
import cache from "../utils/cache";
import { produce } from "immer";
import { updateJobInfo } from "../services/jobs.service";
import * as fs from 'fs';
import * as path from 'path';
const retry = require("async-retry");
const router: Router = express.Router();
const VALID_STATUSES = Object.values(RobotStatus);
const VALID_ROBOT_POSITIONS = Object.values(RobotPosition);
const VALID_LIFT_POSITIONS = Object.values(RobotLiftPosition);
const VALID_EVENT_ALARM_CODES = Object.values(EventAlarmCode);
import wsClient from "../websocket/websocketClient";
import { WSButtonH2RMsg } from "../websocket/utils/wsJsonExtendedFormat";

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Robots Routes
/**
 * @swagger
 * tags:
 *   name: Robots
 *   description: API endpoints for Robots
 */
// Get all robots
/**
 * @swagger
 * /robots:
 *   get:
 *     summary: Retrieve a list of robots
 *     tags: [Robots]
 *     responses:
 *       200:
 *         description: A list of robots.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/RobotDto'
 */
router.get("/robots", async (req: Request, res: Response) => {
  try {
    const robotList = await prisma.robot.findMany();
    // if (robotList.length > 0){
    //     const robot = robotList[0];
    //     res.json(robot);
    //   }
    // else{
    //   throw new Error ("No Exising Entry in Robot Table");
    // }
    res.json(robotList);
  } catch (error) {
    res.status(500).json({ error: "Failed to retrieve robots" });
  }
});

// Get serial of robot
/**
 * @swagger
 * /robot:
 *   get:
 *     summary: Retrieve serial of a  robot
 *     tags: [Robots]
 *     responses:
 *       200:
 *         description: The serial of one robot
 *         content:
 *           string
 */
router.get("/robot", async (req: Request, res: Response) => {
  try {
    const robotList = await prisma.robot.findMany();
    if (robotList.length > 0) {
      const robot = robotList[0];
      res.json(robot);
    }
    else {
      throw new Error("No Exising Entry in Robot Table");
    }
    // res.json(robotList);
  } catch (error) {
    res.status(500).json({ error: "Failed to retrieve robot" });
  }
});

// Create a new robot
/**
 * @swagger
 * /robots:
 *   post:
 *     summary: Create a new robot
 *     tags: [Robots]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateRobotDto'
 *     responses:
 *       200:
 *         description: The created robot
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RobotDto'
 */
router.post(
  "/robots",
  [
    body("version").isString().withMessage("Version should be a string"),
    body("serial").isString().withMessage("Serial should be a string"),
    body("connection")
      .optional()
      .isBoolean()
      .withMessage("Connection should be a boolean"),
    body("status")
      .optional()
      .isInt()
      .withMessage("Status should be an integer")
      .isIn(VALID_STATUSES)
      .withMessage(`Status should be one of ${VALID_STATUSES.join(", ")}`),
    body("operatingSpeed")
      .optional()
      .isInt()
      .withMessage("OperatingSpeed should be an integer")
      .isInt({ min: 2, max: 100 })
      .withMessage("OperatingSpeed should be between 2 and 100"),
    body("robotPosition")
      .optional()
      .isInt()
      .withMessage("RobotPosition should be an integer")
      .isIn(VALID_ROBOT_POSITIONS)
      .withMessage(
        `RobotPosition should be one of ${VALID_ROBOT_POSITIONS.join(", ")}`
      ),
    body("liftPosition")
      .optional()
      .isInt()
      .withMessage("LiftPosition should be an integer")
      .isIn(VALID_LIFT_POSITIONS)
      .withMessage(
        `LiftPosition should be one of ${VALID_LIFT_POSITIONS.join(", ")}`
      ),
    body("eventAlarmCode")
      .optional()
      .isInt()
      .withMessage("EventAlarmCode should be an integer")
      .isIn(VALID_EVENT_ALARM_CODES)
      .withMessage(
        `EventAlarmCode should be one of ${VALID_EVENT_ALARM_CODES.join(", ")}`
      ),
    body("isCameraCalibration")
      .optional()
      .isInt()
      .withMessage("isCameraCalibration should be a integer"),
    body("toolStatus")
      .optional()
      .isBoolean()
      .withMessage("ToolStatus should be a boolean"),
  ],
  async (req: Request, res: Response) => {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const findRobot = await prisma.robot.findUnique({
        where: { serial: req.body.serial },
      });
      if (findRobot) {
        return res.status(400).json({ error: "Robot already exists" });
      }
      const robot = await prisma.robot.create({ data: req.body });
      await prisma.adminPassword.create({
        data: {
          robotSerial: robot.serial,
          password: hashSync("admin"),
        },
      });
      res.status(201).json(robot);
    } catch (error) {
      console.error("🚀 ~ file: robots.ts:226 ~ error:", error);
      res.status(500).json({ error: "Failed to create robot" });
    }
  }
);
// Get a robot by Serial
/**
 * @swagger
 * /robots/{serial}:
 *   get:
 *     operationId: getRobotBySerial
 *     summary: Get a robot by serial number
 *     tags: [Robots]
 *     parameters:
 *       - in: path
 *         name: serial
 *         required: true
 *         schema:
 *           type: string
 *         description: Serial number of the robot
 *     responses:
 *       200:
 *         description: The requested robot
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RobotDto'
 */
router.get(
  "/robots/:serial",
  [param("serial").isString().withMessage("Serial should be a string")],
  async (req: Request, res: Response) => {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { serial } = req.params;
    // const isChanged = cache.get(`robot.${serial}.isChanged`);
    // const cachedRobot = cache.get(`robot.${serial}`);
    // if (!isChanged && !!cachedRobot) {
    //   return res.json(cachedRobot);
    // }
    try {
      const robot = await prisma.robot.findUnique({
        where: { serial: serial },
      });
      if (robot) {
        // cache.set(`robot.${serial}`, robot);
        // cache.set(`robot.${serial}.isChanged`, false);
        res.json(robot);
      } else {
        res.status(404).json({ error: "Robot not found" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to retrieve robot" });
    }
  }
);
// Update a robot
/**
 * @swagger
 * /robots/{serial}:
 *   patch:
 *     summary: Update a robot by SERIAL
 *     tags: [Robots]
 *     parameters:
 *       - in: path
 *         name: serial
 *         required: true
 *         schema:
 *           type: string
 *         description: SERIAL of the robot
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateRobotDto'
 *     responses:
 *       200:
 *         description: The updated robot
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RobotDto'
 */
router.patch(
  "/robots/:serial",
  [
    param("serial").isString().withMessage("Serial should be a string"),
    body("version")
      .optional()
      .isString()
      .withMessage("Version should be a string"),
    body("connection")
      .optional()
      .isBoolean()
      .withMessage("Connection should be a boolean"),
    body("status")
      .optional()
      .isInt()
      .withMessage("Status should be an integer")
      .isIn(VALID_STATUSES)
      .withMessage(`Status should be one of ${VALID_STATUSES.join(", ")}`),
    body("operatingSpeed")
      .optional()
      .isInt()
      .withMessage("OperatingSpeed should be an integer")
      .isInt({ min: 2, max: 100 })
      .withMessage("OperatingSpeed should be between 2 and 100"),
    body("robotPosition")
      .optional()
      .isInt()
      .withMessage("RobotPosition should be an integer")
      .isIn(VALID_ROBOT_POSITIONS)
      .withMessage(
        `RobotPosition should be one of ${VALID_ROBOT_POSITIONS.join(", ")}`
      ),
    body("liftPosition")
      .optional()
      .isInt()
      .withMessage("LiftPosition should be an integer")
      .isIn(VALID_LIFT_POSITIONS)
      .withMessage(
        `LiftPosition should be one of ${VALID_LIFT_POSITIONS.join(", ")}`
      ),
    body("eventAlarmCode")
      .optional()
      .isInt()
      .withMessage("EventAlarmCode should be an integer")
      .isIn(VALID_EVENT_ALARM_CODES)
      .withMessage(
        `EventAlarmCode should be one of ${VALID_EVENT_ALARM_CODES.join(", ")}`
      ),
    body("isCameraCalibration")
      .optional()
      .isInt()
      .withMessage("isCameraCalibration should be a boolean"),
    body("toolStatus")
      .optional()
      .isBoolean()
      .withMessage("ToolStatus should be a boolean"),
  ],
  async (req: Request, res: Response) => {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { serial } = req.params;
    try {
      const findRobot = await prisma.robot.findUnique({
        where: { serial },
      });
      if (!findRobot) {
        return res.status(404).json({ error: "Robot not found" });
      }
      const { operatingSpeed } = req.body;
      if (operatingSpeed !== undefined) {
        const resp = await wsClient.changeSpeedCall(serial, operatingSpeed);
      }
      await retry(
        async (bail: Error) => {
          const robot = await prisma.robot.update({
            where: { serial },
            data: req.body,
          });
          res.json(robot);
        },
        {
          retries: 10,
          factor: 1,
          minTimeout: 100,
          onRetry: (error: Error, attempt: number) => {
            console.log('Attempt number', attempt, ' failed. Retrying...');
          }
        }
      );
    } catch (error) {
      res.status(500).json({ error: "Failed to update robot" });
    }
  }
);
/**
 * @swagger
 * /robots/{serial}/servo-on:
 *   post:
 *     operationId: setServoOn
 *     summary: Turn on servo of the robot by serial number
 *     tags: [Robots]
 *     parameters:
 *       - in: path
 *         name: serial
 *         required: true
 *         schema:
 *           type: string
 *         description: Serial number of the robot
 *     responses:
 *       200:
 *         description: The requested robot with updated status
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RobotDto'
 *       400:
 *         description: Bad request
 *       404:
 *         description: Robot not found
 *       500:
 *         description: Failed to update robot status
 */
router.post(
  "/robots/:serial/servo-on",
  [param("serial").isString().withMessage("Serial should be a string")],
  async (req: Request, res: Response) => {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { serial } = req.params;
    try {
      let robot = await prisma.robot.findUnique({
        where: { serial: serial },
      });
      if (!robot) {
        return res.status(404).json({ error: "Robot not found" });
      }
      else {
        const resp = await wsClient.controlWordCall(serial, rosCommandCode.SERVOON, "");
        await retry(
          async (bail: Error) => {
            await prisma.robot.update({
              where: { serial },
              data: {
                // status: RobotStatus.SERVOON,
                eventAlarmCode: EventAlarmCode.NONE,
              },
            });
          },
          {
            retries: 10,
            factor: 1,
            minTimeout: 100,
            onRetry: (error: Error, attempt: number) => {
              console.log('Attempt number', attempt, ' failed. Retrying /robots/:serial/servo-on: robot.update');
            }
          }
        );
        // const updatedRobot = await prisma.robot.update({
        //   where: { serial: serial },
        //   data: { status: RobotStatus.SERVOON },
        // });
        while (robot && robot.status != RobotStatus.SERVOON) {
          robot = await prisma.robot.findUnique({
            where: { serial: serial },
          });
        }
      }
      res.json({ message: "Robot servo on successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to update robot status" });
    }
  }
);
/**
 * @swagger
 * /robots/{serial}/servo-off:
 *   post:
 *     operationId: setServoOff
 *     summary: Turn off servo of the robot by serial number
 *     tags: [Robots]
 *     parameters:
 *       - in: path
 *         name: serial
 *         required: true
 *         schema:
 *           type: string
 *         description: Serial number of the robot
 *     responses:
 *       200:
 *         description: The requested robot with updated status
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RobotDto'
 *       400:
 *         description: Bad request
 *       404:
 *         description: Robot not found
 *       500:
 *         description: Failed to update robot status
 */
router.post(
  "/robots/:serial/servo-off",
  [param("serial").isString().withMessage("Serial should be a string")],
  async (req: Request, res: Response) => {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { serial } = req.params;
    try {
      const robot = await prisma.robot.findUnique({
        where: { serial: serial },
      });
      if (!robot) {
        return res.status(404).json({ error: "Robot not found" });
      }
      // ROBOE: SERVO OFF
      const resp = await wsClient.controlWordCall(serial, rosCommandCode.SERVOOFF, "");
      // const updatedRobot = await prisma.robot.update({
      //   where: { serial: serial },
      //   data: { status: RobotStatus.SERVOOFF },
      // });
      // res.json(updatedRobot);
    } catch (error) {
      res.status(500).json({ error: "Failed to update robot status" });
    }
  }
);
/**
 * @swagger
 * /robots/{serial}/shutdown:
 *   post:
 *     operationId: shutdownRobotSystem
 *     summary: Shutdown the robot system by serial number
 *     tags: [Robots]
 *     parameters:
 *       - in: path
 *         name: serial
 *         required: true
 *         schema:
 *           type: string
 *         description: Serial number of the robot
 *     responses:
 *       200:
 *         description: The requested robot with updated status and position
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RobotDto'
 *       400:
 *         description: Bad request
 *       404:
 *         description: Robot not found
 *       500:
 *         description: Failed to shutdown the robot system
 */
router.post(
  "/robots/:serial/shutdown",
  [param("serial").isString().withMessage("Serial should be a string")],
  async (req: Request, res: Response) => {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { serial } = req.params;
    try {
      const robot = await prisma.robot.findUnique({
        where: { serial: serial },
      });
      if (!robot) {
        return res.status(404).json({ error: "Robot not found" });
      }
      // ROBOE: 로봇 시스템 종료
      const resp = await wsClient.controlWordCall(serial, rosCommandCode.CONTROL_POWER_OFF, "")
      // const updatedRobot = await prisma.robot.update({
      //   where: { serial: serial },
      //   data: {
      //     status: RobotStatus.SERVOOFF,
      //     robotPosition: RobotPosition.PACKAGE,
      //   },
      // });
      res.json({ message: "Robot Shutdown successfully" });
    } catch (error) {
      res
        .status(500)
        .json({ error: "Failed to update robot status and position" });
    }
  }
);
/**
 * @swagger
 * /robots/{serial}/camera-calibration:
 *   post:
 *     summary: Calibrate the camera of a specific robot by its serial number
 *     tags: [Robots]
 *     operationId: calibrateCamera
 *     parameters:
 *       - in: path
 *         name: serial
 *         required: true
 *         schema:
 *           type: string
 *         description: The serial number of the robot
 *     responses:
 *       200:
 *         description: Robot camera calibrated successfully
 *       404:
 *         description: Robot not found
 *       500:
 *         description: Server error
 */
router.post(
  "/robots/:serial/camera-calibration",
  [param("serial").isString().withMessage("Serial should be a string")],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const serial = req.params.serial;
    try {
      // Find the robot by serial number
      // camera-calibration 이 콜됬을때 일단 현 상태를 -1 로 변경(1 이나 0을 받을 수 있게)
      let robot = await prisma.robot.findUnique({ where: { serial } });
      while (robot && robot.isCameraCalibration != -1) {
        robot = await prisma.robot.findUnique({ where: { serial } });
        await retry(
          async (bail: Error) => {
            await prisma.robot.update({
              where: { serial },
              data: {
                isCameraCalibration: -1,
              }
            });
          },
          {
            retries: 10,
            factor: 1,
            minTimeout: 100,
            onRetry: (error: Error, attempt: number) => {
              console.log('Attempt number', attempt, ' failed. Retrying request /camera-calibration: robot.update');
            }
          }
        );
      }
      // If robot not found, return 404
      if (!robot) {
        return res.status(404).json({ error: "Robot not found" });
      }
      // ROBOE: 로봇 카메라 캘리브레이션
      const resp = await wsClient.controlWordCall(serial, rosCommandCode.OPERATION_START, '{"name":"validation_calibration"}')
      // Return a successful response
      // await prisma.robot.update({
      //   data: {
      //     isCameraCalibration: 1,
      //   },
      //   where: {
      //     serial,
      //   },
      // });
      while (robot && robot.isCameraCalibration == -1 && robot.eventAlarmCode == 0) {
        robot = await prisma.robot.findUnique({ where: { serial } });
      }
      if (robot) {
        if (robot.isCameraCalibration == 1) {
          res.status(200).json({ message: "Robot camera calibrated successfully" });
        }
        else if (robot.isCameraCalibration == 0) {
          res.status(400).json({ message: "Robot camera calibration failed" });
        }
        else {
          res.status(404).json({ message: "Interruption during Robot camera calibration" });
        }
      }
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ error: "An error occurred during camera calibration" });
    }
  }
);
/**
 * @swagger
 * /robots/{serial}/jobs:
 *   get:
 *     summary: Retrieve a list of jobs for a specific robot by serial number
 *     tags: [Robots]
 *     parameters:
 *       - in: path
 *         name: serial
 *         schema:
 *           type: string
 *         required: true
 *         description: The serial number of the robot
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: The page number to retrieve
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *         description: The number of items per page
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         required: true
 *         description: The start date for retrieving the daily work summary
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         required: true
 *         description: The end date for retrieving the daily work summary
 *     responses:
 *       200:
 *         description: A list of jobs for the specified robot.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *               - items
 *               - pagination
 *               properties:
 *                 items:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/RobotJobSummaryDto'
 *                 pagination:
 *                   $ref: '#/components/schemas/PaginationDto'
 *       404:
 *         description: Robot not found
 *       500:
 *         description: An error occurred while retrieving jobs
 */
router.get(
  "/robots/:serial/jobs",
  [
    param("serial").isString().withMessage("Serial should be a string"),
    query("page").optional().isInt().withMessage("Page should be an integer"),
    query("pageSize")
      .optional()
      .isInt()
      .withMessage("PageSize should be an integer"),
    query("startDate")
      .isString()
      .withMessage("SearchDate should be a date")
      .custom((value: string | number | Date) => {
        if (!value) {
          return true;
        }
        const date = new Date(value);
        return !isNaN(date.getTime());
      })
      .withMessage("SearchDate should be a valid date"),
    query("endDate")
      .isString()
      .withMessage("SearchDate should be a date")
      .custom((value: string | number | Date) => {
        if (!value) {
          return true;
        }
        const date = new Date(value);
        return !isNaN(date.getTime());
      })
      .withMessage("SearchDate should be a valid date"),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 10;
    const serial = req.params.serial;
    const startDate = new Date(req.query.startDate as string);
    const endDate = new Date(req.query.endDate as string);
    try {
      // Find the robot by serial number
      const robot = await prisma.robot.findUnique({ where: { serial } });
      // If robot not found, return 404
      if (!robot) {
        return res.status(404).json({ error: "Robot not found" });
      }
      // Retrieve jobs for the robot
      const loadingJobs = await prisma.job.findMany({
        where: {
          robotId: robot.id,
          AND: [
            { startedAt: { gte: startDate } },
            { endedAt: { lte: endDate } },
            { jobPallet: { isBuffer: false } },
          ],
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: {
          endedAt: "desc",
        },
        select: {
          id: true,
          bph: true,
          loadingRate: true,
          startedAt: true,
          endedAt: true,
          _count: {
            select: {
              boxPositions: {
                where: {
                  boxName: {
                    not: {
                      equals: "ghost",
                    },
                  },
                  isLoading: true,
                },
              },
            },
          },
          jobPallet: {
            select: {
              // orderGroup: true,
              // chuteNo: true,
              palletBarcode: true,
              orderInformation: true,
            },
          },
          JobGroup: {
            select: {
              name: true,
              location: true,
            },
          },
        },
      });
      const unloadingJobs = await prisma.job.findMany({
        where: {
          robotId: robot.id,
          AND: [
            { startedAt: { gte: startDate } },
            { endedAt: { lte: endDate } },
            { jobPallet: { isBuffer: false } },
          ],
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: {
          endedAt: "desc",
        },
        select: {
          id: true,
          bph: true,
          loadingRate: true,
          startedAt: true,
          endedAt: true,
          _count: {
            select: {
              boxPositions: {
                where: {
                  boxName: {
                    not: {
                      equals: "ghost",
                    },
                  },
                  isLoading: false,
                },
              },
            },
          },
          jobPallet: {
            select: {
              palletBarcode: true,
            },
          },
        },
      });
      const jobs = loadingJobs.map((job: any, index: number) => {
        return produce(job, (draft: { _count: { boxPositions: number; }; }) => {
          draft._count.boxPositions =
            draft._count.boxPositions -
            unloadingJobs[index]._count.boxPositions;
          return draft;
        });
      });
      const totalItemCount = await prisma.job.count({
        where: {
          robotId: robot.id,
          AND: [
            { startedAt: { gte: startDate } },
            { endedAt: { lte: endDate } },
            { jobPallet: { isBuffer: false } },
          ],
        },
      });
      const totalPage = Math.ceil(totalItemCount / pageSize);
      const currentItemCount = jobs.length;
      const response = {
        items: jobs,
        pagination: {
          totalItemCount,
          currentItemCount,
          totalPage,
          currentPage: page,
          itemsPerPage: pageSize,
        },
      };
      // Return the jobs
      return res.status(200).json(response);
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ error: "An error occurred while retrieving jobs" });
    }
  }
);
/**
 * @swagger
 * /robots/{serial}/jobs/start:
 *   post:
 *     summary: Start a job for the robot by serial number
 *     tags: [Robots]
 *     parameters:
 *       - in: path
 *         name: serial
 *         schema:
 *           type: string
 *         required: true
 *         description: The serial number of the robot
 *     responses:
 *       200:
 *         description: The started job details.
 *       400:
 *         description: Bad request
 *       404:
 *         description: Robot not found
 *       500:
 *         description: Failed to start the job
 */
router.post(
  "/robots/:serial/jobs/start",
  [param("serial").isString().withMessage("Serial should be a string")],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const serial = req.params.serial;
    try {
      // Starting a job for the robot
      const robot = await prisma.robot.findUnique({ where: { serial } });
      // If robot not found, return 404
      if (!robot) {
        return res.status(404).json({ error: "Robot not found" });
      }
      if (robot.application.toUpperCase() == "DEPALLETIZING") {
        const depalJobGroup = await prisma.jobGroup.create({
          data: {
            name: "DEPAL",
            location: "D8"
          }
        })
        const pallet_location_list = ["좌측", "우측", "보조(좌)", "보조(우)"];
        const depalJobBox = '[{"name":"DEPAL","width":0,"height":0,"length":0,"weight":0,"labelDirection":0,"jobId":88}]'
        for (const pallet of pallet_location_list) {
          const depalJob = await prisma.job.create({
            data: {
              robotId: robot.id,
              jobGroupId: depalJobGroup.id,
              jobBoxes: depalJobBox
            },
          });
          const depalJobPallet = await prisma.jobPallet.create({
            data: {
              jobId: depalJob.id,
              isBuffer: false,
              isUse: true,
              location: pallet,
              orderInformation: "DEPAL",
              loadingPatternName: "DEPAL"
            }
          });
          console.log(depalJob);
          console.log(depalJobPallet);
        }
      }
      const unStartedJobs = await prisma.job.findMany({
        where: {
          robotId: robot.id,
          endedAt: null,
          endFlag: false,
        },
      });
      if (unStartedJobs.length === 0) {
        return res.status(404).json({ error: "Job not found" });
      }
      await retry(
        async (bail: Error) => {
          await prisma.job.updateMany({
            where: {
              robotId: robot.id,
              startedAt: null,
              endedAt: null,
              endFlag: false,
            },
            data: {
              startedAt: new Date(),
            },
          });
        },
        {
          retries: 10,
          factor: 1,
          minTimeout: 100,
          onRetry: (error: Error, attempt: number) => {
            console.log('Attempt number', attempt, ' failed. Retrying request: /start: job.updateMany');
          }
        }
      );
      // await prisma.robot.update({
      //   where: { serial },
      //   data: {
      //     status: RobotStatus.OPERATING,
      //   },
      // });
      // ROBOE: 로봇 작업 시작
      // // Job 관련 정보 보내기 (Box/Pallet type)
      console.log("SENDPREVJOBINFO");
      const jobresp = await wsClient.sendPrevJobInfo(serial, SenderId.RPM.toString());
      // Prev Job 에 쌓여있던 박스 정보 보내기
      console.log("PREVIOUSJOBINFOCALL");
      const boxpositionresp = await wsClient.PreviousJobInfocall(serial);
      // 작업 시작 명령 보내기
      const resp = await wsClient.controlWordCall(serial, rosCommandCode.OPERATION_START, '{"name":"cmp20_motion_test"}');
      res.json({ message: "Robot Job resume successfully" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to resume the job" });
    }
  }
);
/**
 * @swagger
 * /robots/{serial}/jobs/cjstart:
 *   post:
 *     summary: Start a custom job for the robot by serial number
 *     tags: [Robots]
 *     parameters:
 *       - in: path
 *         name: serial
 *         required: true
 *         schema:
 *           type: string
 *         description: The serial number of the robot to start the job.
 *     responses:
 *       200:
 *         description: Job for the robot started successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Robot Job resume successfully"
 *       400:
 *         description: Validation error if serial is not a string or other validation fails.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       msg:
 *                         type: string
 *                       param:
 *                         type: string
 *                       location:
 *                         type: string
 *       404:
 *         description: Robot not found with the provided serial number.
 *       500:
 *         description: Internal server error, failed to start the job for the robot.
 */
router.post(
  "/robots/:serial/jobs/cjstart",
  [param("serial").isString().withMessage("Serial should be a string")],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const serial = req.params.serial;
    try {
      // Starting a job for the robot
      const robot = await prisma.robot.findUnique({ where: { serial } });
      // If robot not found, return 404
      if (!robot) {
        return res.status(404).json({ error: "Robot not found" });
      }
      // await prisma.robot.update({
      //   where: { serial },
      //   data: {
      //     status: RobotStatus.OPERATING,
      //   },
      // });
      // ROBOE: 로봇 작업 시작
      // // Job 관련 정보 보내기 (Box/Pallet type)
      const jobresp = await wsClient.sendCJJobInfo(serial, SenderId.CPM.toString());
      // Prev Job 에 쌓여있던 박스 정보 보내기
      const boxpositionresp = await wsClient.CJJobInfocall(serial);
      // 작업 시작 명령 보내기
      const resp = await wsClient.controlWordCall(serial, rosCommandCode.OPERATION_START, '{"name":"cmp20_motion_test"}');
      res.json({ message: "Robot Job resume successfully" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to resume the job" });
    }
  }
);
/**
 * @swagger
 * /robots/{serial}/jobs/resume:
 *   post:
 *     summary: Resume a job for the robot by serial number
 *     tags: [Robots]
 *     parameters:
 *       - in: path
 *         name: serial
 *         schema:
 *           type: string
 *         required: true
 *         description: The serial number of the robot
 *     responses:
 *       200:
 *         description: The resumeed job details.
 *       400:
 *         description: Bad request
 *       404:
 *         description: Robot not found
 *       500:
 *         description: Failed to resume the job
 */
router.post(
  "/robots/:serial/jobs/resume",
  [param("serial").isString().withMessage("Serial should be a string")],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const serial = req.params.serial;
    try {
      // Resumeing a job for the robot
      const robot = await prisma.robot.findUnique({ where: { serial } });
      // If robot not found, return 404
      if (!robot) {
        return res.status(404).json({ error: "Robot not found" });
      }
      const resp = await wsClient.controlWordCall(serial, rosCommandCode.CONTROL_OPERATION_RESUME, '');
      res.json({ message: "Robot Job resume successfully" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to resume the job" });
    }
  }
);
/**
 * @swagger
 * /robots/{serial}/jobs/pause:
 *   post:
 *     summary: Pause a job for the robot by serial number
 *     tags: [Robots]
 *     parameters:
 *       - in: path
 *         name: serial
 *         schema:
 *           type: string
 *         required: true
 *         description: The serial number of the robot
 *     responses:
 *       200:
 *         description: The pauseed job details.
 *       400:
 *         description: Bad request
 *       404:
 *         description: Robot not found
 *       500:
 *         description: Failed to pause the job
 */
router.post(
  "/robots/:serial/jobs/pause",
  [param("serial").isString().withMessage("Serial should be a string")],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const serial = req.params.serial;
    try {
      const robot = await prisma.robot.findUnique({ where: { serial } });
      if (!robot) {
        return res.status(404).json({ error: "Robot not found" });
      }
      // ROBOE: 로봇 작업 일시정지
      const resp = await wsClient.controlWordCall(serial, rosCommandCode.CONTRON_OPERATION_PAUSE, "");
      res.json({ message: "Robot Job pauseed successfully" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to pause the job" });
    }
  }
);
/**
 * @swagger
 * /robots/{serial}/jobs/stop:
 *   post:
 *     summary: Stop a job for the robot by serial number
 *     tags: [Robots]
 *     parameters:
 *       - in: path
 *         name: serial
 *         schema:
 *           type: string
 *         required: true
 *         description: The serial number of the robot
 *     responses:
 *       200:
 *         description: The stoped job details.
 *       400:
 *         description: Bad request
 *       404:
 *         description: Robot not found
 *       500:
 *         description: Failed to stop the job
 */
router.post(
  "/robots/:serial/jobs/stop",
  [param("serial").isString().withMessage("Serial should be a string")],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const serial = req.params.serial;
    try {
      const robot = await prisma.robot.findUnique({ where: { serial } });
      if (!robot) {
        return res.status(404).json({ error: "Robot not found" });
      }
      // ROBOE: 로봇 작업 정지
      const resp = await wsClient.controlWordCall(serial, rosCommandCode.CONTROL_OPERATION_STOP, "");
      // await prisma.robot.update({
      //   where: { serial },
      //   data: {
      //     status: RobotStatus.SERVOON,
      //     eventAlarmCode: EventAlarmCode.NONE,
      //   },
      // });
      // await prisma.job.updateMany({
      //   where: {
      //     robotId: robot.id,
      //     endedAt: null,
      //     endFlag: false,
      //   },
      //   data: {
      //     endedAt: new Date(),
      //     endFlag: true,
      //   },
      // });
      res.json({ message: "Robot Job stoped successfully" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to stop the job" });
    }
  }
);
/**
 * @swagger
 * /robots/{serial}/jobs/current:
 *   get:
 *     summary: Retrieve current jobs for a robot by serial number
 *     tags: [Robots]
 *     parameters:
 *       - in: path
 *         name: serial
 *         schema:
 *           type: string
 *         required: true
 *         description: The serial number of the robot
 *     responses:
 *       200:
 *         description: A list of current jobs for the robot.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/JobDto'
 *       404:
 *         description: Robot not found
 *       500:
 *         description: Server error
 */
router.get(
  "/robots/:serial/jobs/current",
  [param("serial").isString().withMessage("Serial should be a string")],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const serial = req.params.serial;
    try {
      // Find the robot by serial number
      const robot = await prisma.robot.findUnique({ where: { serial } });
      // If robot not found, return 404
      if (!robot) {
        return res.status(404).json({ error: "Robot not found" });
      }
      // Find current jobs for the robot
      const currentJobs = await prisma.job.findMany({
        where: {
          robotId: robot.id,
          endedAt: null,
          endFlag: false,
        },
        include: {
          // jobBoxes: true,
          jobPallet: true,
        },
      });
      // Define order of the result list as below
      const locationOrder: Record<string, number> = {
        "좌측": 1,
        "우측": 2,
        "보조(좌)": 3,
        "보조(우)": 4,
      };
      currentJobs.sort((a, b) => {
        const aOrder = a.jobPallet && a.jobPallet.location
          ? locationOrder[a.jobPallet.location] ?? 5
          : 6; // If a.jobPallet is null, move it to the end
        const bOrder = b.jobPallet && b.jobPallet.location
          ? locationOrder[b.jobPallet.location] ?? 5
          : 6; // If b.jobPallet is null, move it to the end
        return aOrder - bOrder; // Ascending order
      });
      // Return the sorted current jobs
      res.json(currentJobs);
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ error: "An error occurred while retrieving current jobs" });
    }
  }
);
/**
 * @swagger
 * /robots/{serial}/logs/unchecked:
 *   get:
 *     summary: Retrieve count of unchecked logs for a robot by serial number
 *     tags: [Robots, Logs]
 *     parameters:
 *       - in: path
 *         name: serial
 *         schema:
 *           type: string
 *         required: true
 *         description: The serial number of the robot
 *     responses:
 *       200:
 *         description: The count of unchecked logs for the robot
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/LogDto'
 *       404:
 *         description: Robot not found
 *       500:
 *         description: An error occurred while retrieving the count of unchecked logs
 */
router.get(
  "/robots/:serial/logs/unchecked",
  [param("serial").isString().withMessage("Serial should be a string")],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { serial } = req.params;
    // const isChangedLog = cache.get(`robot-${serial}.log.isChanged`);
    // const cachedLogs = cache.get(`robot-${serial}.log`);
    // if (!isChangedLog && !!cachedLogs) {
    //   return res.json(cachedLogs);
    // }
    const robot = await prisma.robot.findUnique({
      where: { serial: serial },
    });
    if (!robot) {
      return res.status(404).json({ error: "Robot not found" });
    }
    try {
      const logs = await prisma.log.findMany({
        where: {
          robotId: robot.id,
          checked: false,
          OR: [
            {
              level: Level.ERROR,
            },
            {
              level: Level.WARNING,
            },
          ],
        },
      });
      // cache.set(`robot-${serial}.log`, logs);
      // cache.set(`robot-${serial}.log.isChanged`, false);
      res.json(logs);
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ error: "Failed to retrieve unchecked logs count" });
    }
  }
);
/**
 * @swagger
 * tags:
 *   name: Robots
 *   description: API endpoints for Robots
 *
 * /robots/{serial}/work-summary/day:
 *   get:
 *     summary: Retrieve daily work summary for a robot by serial number
 *     tags: [Robots]
 *     parameters:
 *       - in: path
 *         name: serial
 *         schema:
 *           type: string
 *         required: true
 *         description: The serial number of the robot
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         required: true
 *         description: The start date for retrieving the daily work summary
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         required: true
 *         description: The end date for retrieving the daily work summary
 *     responses:
 *       200:
 *         description: The daily work summary for the robot
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DailyWorkSummaryDto'
 *       404:
 *         description: Robot not found
 *       500:
 *         description: An error occurred while retrieving the work summary
 */
router.get(
  "/robots/:serial/work-summary/day",
  [
    param("serial").isString().withMessage("Serial should be a string"),
    query("startDate").isString().withMessage("SearchDate should be a date"),
    query("endDate").isString().withMessage("SearchDate should be a date"),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const serial = req.params.serial;
    const startDate = new Date(req.query.startDate as string);
    const endDate = new Date(req.query.endDate as string);
    try {
      const robot = await getRobotBySerial(serial);
      if (!robot) {
        return res.status(404).json({ error: "Robot not found" });
      }
      const jobs = await getJobsForRobotOnDate(robot.id, startDate, endDate);
      const avgBph = calculateAverageBph(jobs);
      const avgLoadingRate = calculateAverageLoadingRate(jobs);
      const warningAndErrorLogCounts = await getWarningAndErrorLogCounts(
        robot.id,
        startDate,
        endDate
      );
      res.json({
        jobs: jobs.map((job: { loadingRate: any; bph: any; }) => ({
          loadingRate: job.loadingRate,
          bph: job.bph,
        })),
        avgBph,
        avgLoadingRate,
        finishedPalletCount: jobs.length,
        warningAndErrorLogCounts,
      });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ error: "An error occurred while fetching the work summary" });
    }
  }
);
/**
 * @swagger
 * /robots/{serial}/work-summary/day/csv:
 *   get:
 *     summary: Download a daily work summary for a specific robot as a CSV file
 *     tags: [Robots]
 *     parameters:
 *       - in: path
 *         name: serial
 *         schema:
 *           type: string
 *         required: true
 *         description: The robot's serial number
 *     responses:
 *       200:
 *         description: CSV file of the daily work summary
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *               example: |
 *                 date,pallets,avgBph,avgLoadingRate,logCount
 *                 2023-08-21,5,100,95,10
 *                 2023-08-20,4,95,90,5
 *       400:
 *         description: Bad request (e.g., invalid serial format)
 *       404:
 *         description: Robot not found
 *       500:
 *         description: Server error
 */
router.get(
  "/robots/:serial/work-summary/day/csv",
  [param("serial").isString().withMessage("Serial should be a string")],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const serial = req.params.serial;
    try {
      const robot = await getRobotBySerial(serial);
      if (!robot) {
        return res.status(404).json({ error: "Robot not found" });
      }
      const jobs = await getJobsGroupedByEndDate(robot.id);
      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${new Date().toISOString()}_jobs.csv"`
      );
      stringify(jobs, { header: true }).pipe(res);
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ error: "An error occurred while fetching the work summary" });
    }
  }
);
/**
 * @swagger
 * /robots/{serial}/work-summary/month:
 *   get:
 *     summary: Retrieve monthly work summary for a robot by serial number
 *     tags: [Robots]
 *     parameters:
 *       - in: path
 *         name: serial
 *         schema:
 *           type: string
 *         required: true
 *         description: The serial number of the robot
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         required: true
 *         description: The start date for retrieving the daily work summary
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         required: true
 *     responses:
 *       200:
 *         description: The monthly work summary for the robot
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MonthlyWorkSummaryDto'
 *       404:
 *         description: Robot not found
 *       500:
 *         description: An error occurred while retrieving the work summary
 */
router.get(
  "/robots/:serial/work-summary/month",
  [
    param("serial").isString().withMessage("Serial should be a string"),
    query("startDate").isString().withMessage("SearchDate should be a date"),
    query("endDate").isString().withMessage("SearchDate should be a date"),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const serial = req.params.serial;
    const startDate = new Date(req.query.startDate as string);
    const endDate = new Date(req.query.endDate as string);
    try {
      const robot = await getRobotBySerial(serial);
      if (!robot) {
        return res.status(404).json({ error: "Robot not found" });
      }
      const jobs = await getJobsForRobotOnDate(robot.id, startDate, endDate);
      const jobByDay = chain(jobs)
        .groupBy((job: { endedAt: any; }) =>
          job.endedAt ? format(job.endedAt, "yyyy-MM-dd") : ""
        )
        .reduce(
          (
            result: {
              [key: string]: {
                avgBph: number;
                avgLoadingRate: number;
              };
            },
            jobs: any[],
            date: string | number
          ) => {
            result[date] = {
              avgBph: calculateAverageBph(jobs),
              avgLoadingRate: calculateAverageLoadingRate(jobs),
            };
            return result;
          },
          {}
        )
        .value();
      const avgBph = calculateAverageBph(jobs);
      const avgLoadingRate = calculateAverageLoadingRate(jobs);
      const warningAndErrorLogCounts = await getWarningAndErrorLogCounts(
        robot.id,
        startDate,
        endDate
      );
      res.json({
        jobByDay,
        avgBph,
        avgLoadingRate,
        finishedPalletCount: jobs.length,
        warningAndErrorLogCounts,
      });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ error: "An error occurred while fetching the work summary" });
    }
  }
);
/**
 * @swagger
 * /robots/{serial}/jobs/end-incomplete:
 *   patch:
 *     summary: End all incomplete jobs for a robot by serial number
 *     tags: [Robots]
 *     parameters:
 *       - in: path
 *         name: serial
 *         schema:
 *           type: string
 *         required: true
 *         description: The serial number of the robot
 *     responses:
 *       200:
 *         description: Successfully ended all incomplete jobs for the robot.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       404:
 *         description: Robot not found
 *       500:
 *         description: Server error
 */
router.patch(
  "/robots/:serial/jobs/end-incomplete",
  [param("serial").isString().withMessage("Serial should be a string")],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const serial = req.params.serial;
    try {
      // Find the robot by serial number
      const robot = await prisma.robot.findUnique({ where: { serial } });
      // If robot not found, return 404
      if (!robot) {
        return res.status(404).json({ error: "Robot not found" });
      }
      // Update all incomplete jobs for the robot
      await retry(
        async (bail: Error) => {
          await prisma.job.updateMany({
            where: {
              robotId: robot.id,
              endedAt: null,
              endFlag: false,
            },
            data: {
              endedAt: new Date(),
              endFlag: true,
            },
          });
        },
        {
          retries: 10,
          factor: 1,
          minTimeout: 100,
          onRetry: (error: Error, attempt: number) => {
            console.log('Attempt number', attempt, ' failed. Retrying request: /end-incomplete: job.updateMany');
          }
        }
      );
      const resp = await wsClient.controlWordCall(serial, rosCommandCode.CONTROL_OPERATION_STOP, '');
      await delay(500);

      // Return success message
      res.json({
        message: "Successfully ended all incomplete jobs for the robot.",
      });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ error: "An error occurred while ending incomplete jobs" });
    }
  }
);
/**
 * @swagger
 * /robots/{serial}/jobs/continue-stop:
 *   post:
 *     summary: End all incomplete jobs for a robot by serial number
 *     tags: [Robots]
 *     parameters:
 *       - in: path
 *         name: serial
 *         schema:
 *           type: string
 *         required: true
 *         description: The serial number of the robot
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RobotJobContinueStopDto'
 *     responses:
 *       200:
 *         description: Successfully ended all incomplete jobs for the robot.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       404:
 *         description: Robot not found
 *       500:
 *         description: Server error
 */
router.post(
  "/robots/:serial/jobs/continue-stop",
  [
    param("serial").isString().withMessage("Serial should be a string"),
    body("jobId").isInt().withMessage("JobId should be a Int"),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const serial = req.params.serial;
    const jobId = req.body.jobId;
    try {
      // Find the robot by serial number
      const robot = await prisma.robot.findUnique({ where: { serial } });
      // If robot not found, return 404
      if (!robot) {
        return res.status(404).json({ error: "Robot not found" });
      }
      const job = await prisma.job.findUnique({ where: { id: jobId } });
      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }
      // Update all incomplete jobs for the robot
      await retry(
        async (bail: Error) => {
          await prisma.job.update({
            where: {
              id: jobId,
              endedAt: null,
              endFlag: false,
            },
            data: {
              endedAt: new Date(),
              endFlag: true,
            },
          });
        },
        {
          retries: 10,
          factor: 1,
          minTimeout: 100,
          onRetry: (error: Error, attempt: number) => {
            console.log(
              "Attempt number",
              attempt,
              " failed. Retrying request /continue-stop : job.updateMany"
            );
          },
        }
      );
      await retry(
        async (bail: Error) => {
          await prisma.robot.update({
            where: { serial },
            data: {
              // status: RobotStatus.SERVOON,
              eventAlarmCode: EventAlarmCode.NONE,
            },
          });
        },
        {
          retries: 10,
          factor: 1,
          minTimeout: 100,
          onRetry: (error: Error, attempt: number) => {
            console.log(
              "Attempt number",
              attempt,
              " failed. Retrying request /continue-stop: robot.update"
            );
          },
        }
      );
      // Return success message
      res.json({
        message: "Successfully ended all incomplete jobs for the robot.",
      });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ error: "An error occurred while ending incomplete jobs" });
    }
  }
);
/**
 * @swagger
 * /robots/{serial}/jobs/continue:
 *   post:
 *     summary: End all incomplete jobs for a robot by serial number
 *     tags: [Robots]
 *     parameters:
 *       - in: path
 *         name: serial
 *         schema:
 *           type: string
 *         required: true
 *         description: The serial number of the robot
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RobotJobContinueDto'
 *     responses:
 *       200:
 *         description: Successfully ended all incomplete jobs for the robot.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       404:
 *         description: Robot not found
 *       500:
 *         description: Server error
 */
router.post(
  "/robots/:serial/jobs/continue",
  [
    param("serial").isString().withMessage("Serial should be a string"),
    body("jobId").isInt().withMessage("JobId should be a string"),
    body("palletBarcode")
      .isString()
      .withMessage("PalletBarcode should be a string"),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const serial = req.params.serial;
    const jobId = req.body.jobId;
    const palletBarcode = req.body.palletBarcode;
    try {
      // Find the robot by serial number
      const robot = await prisma.robot.findUnique({ where: { serial } });
      // If robot not found, return 404
      if (!robot) {
        return res.status(404).json({ error: "Robot not found" });
      }
      const job = await prisma.job.findUnique({
        where: { id: jobId },
        include: {
          jobPallet: true,
        },
      });
      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }
      if (!job.jobPallet) {
        return res.status(404).json({ error: "JobPallet not found" });
      }
      const newJob = await prisma.job.create({
        data: {
          robotId: robot.id,
          jobGroupId: job.jobGroupId,
          jobBoxes: job.jobBoxes,
        },
      });
      const { id, createdAt, updatedAt, ...rest } = job.jobPallet;
      await prisma.jobPallet.create({
        data: {
          ...rest,
          jobId: newJob.id,
          palletBarcode,
        },
      });
      // Update all incomplete jobs for the robot
      await retry(
        async (bail: Error) => {
          await prisma.job.update({
            where: {
              id: jobId,
              endedAt: null,
              endFlag: false,
            },
            data: {
              endedAt: new Date(),
              endFlag: true,
            },
          });
        },
        {
          retries: 10,
          factor: 1,
          minTimeout: 100,
          onRetry: (error: Error, attempt: number) => {
            console.log(
              "Attempt number",
              attempt,
              " failed. Retrying request /continue-stop : job.updateMany"
            );
          },
        }
      );
      await retry(
        async (bail: Error) => {
          await prisma.robot.update({
            where: { serial },
            data: {
              // status: RobotStatus.SERVOON,
              eventAlarmCode: EventAlarmCode.NONE,
            },
          });
        },
        {
          retries: 10,
          factor: 1,
          minTimeout: 100,
          onRetry: (error: Error, attempt: number) => {
            console.log(
              "Attempt number",
              attempt,
              " failed. Retrying request /continue-stop: robot.update"
            );
          },
        }
      );
      // Return success message
      res.json({
        message: "Successfully ended all incomplete jobs for the robot.",
      });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ error: "An error occurred while ending incomplete jobs" });
    }
  }
);
/**
 * @swagger
 * /robots/{serial}/gripper-attach:
 *   post:
 *     operationId: setGripperAttach
 *     summary: Set gripper state to attached
 *     tags: [Robots]
 *     parameters:
 *       - in: path
 *         name: serial
 *         required: true
 *         schema:
 *           type: string
 *         description: Serial number of the robot
 *     responses:
 *       200:
 *         description: The gripper state was successfully changed to attached
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RobotDto'
 *       400:
 *         description: Bad request
 *       404:
 *         description: Robot not found
 *       500:
 *         description: Failed to change gripper state
 */
router.post(
  "/robots/:serial/gripper-attach",
  [param("serial").isString().withMessage("Serial should be a string")],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { serial } = req.params;
    try {
      const robot = await prisma.robot.findUnique({ where: { serial } });
      if (!robot) {
        return res.status(404).json({ error: "Robot not found" });
      }
      const result = await wsClient.gripperControlCall(serial, 0, true);
      if (result == true) {
        await retry(
          async (bail: Error) => {
            const updatedRobot = await prisma.robot.update({
              where: { serial },
              data: { toolStatus: true },
            });
            res.json(updatedRobot);
          },
          {
            retries: 10,
            factor: 1,
            minTimeout: 100,
            onRetry: (error: Error, attempt: number) => {
              console.log('Attempt number', attempt, ' failed. Retrying request: /gripper-attach: robot.update');
            }
          }
        );
      }
      else {
        res.status(500).json({ error: "Failed to change gripper state" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to change gripper state" });
    }
  }
);
/**
 * @swagger
 * /robots/{serial}/gripper-release:
 *   post:
 *     operationId: setGripperRelease
 *     summary: Set gripper state to released
 *     tags: [Robots]
 *     parameters:
 *       - in: path
 *         name: serial
 *         required: true
 *         schema:
 *           type: string
 *         description: Serial number of the robot
 *     responses:
 *       200:
 *         description: The gripper state was successfully changed to released
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RobotDto'
 *       400:
 *         description: Bad request
 *       404:
 *         description: Robot not found
 *       500:
 *         description: Failed to change gripper state
 */
router.post(
  "/robots/:serial/gripper-release",
  [param("serial").isString().withMessage("Serial should be a string")],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { serial } = req.params;
    try {
      const robot = await prisma.robot.findUnique({ where: { serial } });
      if (!robot) {
        return res.status(404).json({ error: "Robot not found" });
      }
      const result = await wsClient.gripperControlCall(serial, 0, false);
      if (result == true) {
        await retry(
          async (bail: Error) => {
            const updatedRobot = await prisma.robot.update({
              where: { serial },
              data: { toolStatus: false },
            });
            res.json(updatedRobot);
          },
          {
            retries: 10,
            factor: 1,
            minTimeout: 100,
            onRetry: (error: Error, attempt: number) => {
              console.log('Attempt number', attempt, ' failed. Retrying request: /gripper-release: robot.update');
            }
          }
        );
      }
      else {
        res.status(500).json({ error: "Failed to change gripper state" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to change gripper state" });
    }
  }
);
let liftCount = 0;
let positionCount = 0;
let gripperCount = 0;
let buttonmsg = new WSButtonH2RMsg();
/**
 * @swagger
 * /robots/{serial}/position-home:
 *   post:
 *     operationId: setPositionHome
 *     summary: Set robot position to HOME
 *     tags: [Robots]
 *     parameters:
 *       - in: path
 *         name: serial
 *         required: true
 *         schema:
 *           type: string
 *         description: Serial number of the robot
 *     responses:
 *       200:
 *         description: The robot position was successfully changed to HOME
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RobotDto'
 *       400:
 *         description: Bad request
 *       404:
 *         description: Robot not found
 *       500:
 *         description: Failed to change robot position
 */
router.post(
  "/robots/:serial/position-home",
  [param("serial").isString().withMessage("Serial should be a string")],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { serial } = req.params;
    try {
      const robot = await prisma.robot.findUnique({ where: { serial } });
      if (!robot) {
        return res.status(404).json({ error: "Robot not found" });
      }
      if (positionCount == 0) {//가장 처음 불렸을때 jobstask 실행
        const resp = await wsClient.controlWordCall(serial, rosCommandCode.OPERATION_START, '{"name":"robot_manual_control", "pos":"HOME"}')
      }
      buttonmsg.count = positionCount;
      buttonmsg.stamp = Date.now() / 1000;
      wsClient.buttonStatePub(buttonmsg);
      positionCount += 1;
      // await controlWordCall(serial, rosCommandCode.OPERATION_START, '{"name":"robot_manual_control", "pos":"HOME"}');
      res.json({ message: "success" });
    } catch (error) {
      res.status(500).json({ error: "Failed to change robot position" });
    }
  }
);
/**
 * @swagger
 * /robots/{serial}/position-package:
 *   post:
 *     operationId: setPositionPackage
 *     summary: Set robot position to PACKAGE
 *     tags: [Robots]
 *     parameters:
 *       - in: path
 *         name: serial
 *         required: true
 *         schema:
 *           type: string
 *         description: Serial number of the robot
 *     responses:
 *       200:
 *         description: The robot position was successfully changed to PACKAGE
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RobotDto'
 *       400:
 *         description: Bad request
 *       404:
 *         description: Robot not found
 *       500:
 *         description: Failed to change robot position
 */
router.post(
  "/robots/:serial/position-package",
  [param("serial").isString().withMessage("Serial should be a string")],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { serial } = req.params;
    try {
      const robot = await prisma.robot.findUnique({ where: { serial } });
      if (positionCount == 0) {//가장 처음 불렸을때 jobstask 실행
        const resp = await wsClient.controlWordCall(serial, rosCommandCode.OPERATION_START, '{"name":"robot_manual_control", "pos":"PACK"}')
      }
      buttonmsg.count = positionCount;
      buttonmsg.stamp = Date.now() / 1000;
      wsClient.buttonStatePub(buttonmsg);
      positionCount += 1;
      if (!robot) {
        return res.status(404).json({ error: "Robot not found" });
      }
      // await controlWordCall(serial, rosCommandCode.OPERATION_START, '{"name":"robot_manual_control", "pos":"PACK"}');
      res.json({ message: "success" });
    } catch (error) {
      res.status(500).json({ error: "Failed to change robot position" });
    }
  }
);
/**
 * @swagger
 * /robots/{serial}/reset-position-count:
 *   post:
 *     operationId: resetPositionCount
 *     summary: Reset the robot's position count
 *     tags: [Robots]
 *     parameters:
 *       - in: path
 *         name: serial
 *         required: true
 *         schema:
 *           type: string
 *         description: Serial number of the robot
 *     responses:
 *       200:
 *         description: The robot's position count was successfully reset
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "success"
 *       400:
 *         description: Bad request
 *       404:
 *         description: Robot not found
 *       500:
 *         description: Failed to reset the robot's position count
 */
router.post(
  "/robots/:serial/reset-position-count",
  [param("serial").isString().withMessage("Serial should be a string")],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { serial } = req.params;
    try {
      const robot = await prisma.robot.findUnique({ where: { serial } });
      if (!robot) {
        return res.status(404).json({ error: "Robot not found" });
      }
      positionCount = 0;
      // 여기에 포지션 카운트를 리셋하는 로직을 추가하십시오.
      res.json({ message: "success" });
    } catch (error) {
      res.status(500).json({ error: "Failed to change robot position" });
    }
  }
);
/**
 * @swagger
 * /robots/{serial}/reset-lift-count:
 *   post:
 *     operationId: resetLiftCount
 *     summary: Reset the robot's lift count
 *     tags: [Robots]
 *     parameters:
 *       - in: path
 *         name: serial
 *         required: true
 *         schema:
 *           type: string
 *         description: Serial number of the robot
 *     responses:
 *       200:
 *         description: The robot's lift count was successfully reset
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "success"
 *       400:
 *         description: Bad request
 *       404:
 *         description: Robot not found
 *       500:
 *         description: Failed to reset the robot's lift count
 */
router.post(
  "/robots/:serial/reset-lift-count",
  [param("serial").isString().withMessage("Serial should be a string")],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { serial } = req.params;
    try {
      const robot = await prisma.robot.findUnique({ where: { serial } });
      if (!robot) {
        return res.status(404).json({ error: "Robot not found" });
      }
      // 여기에 리프트 카운트를 리셋하는 로직을 추가하십시오.
      liftCount = 0;
      res.json({ message: "success" });
    } catch (error) {
      res.status(500).json({ error: "Failed to reset robot's lift count" });
    }
  }
);
/**
 * @swagger
 * /robots/{serial}/lift-up:
 *   post:
 *     operationId: setLiftUp
 *     summary: Set robot lift position to UP (MAX)
 *     tags: [Robots]
 *     parameters:
 *       - in: path
 *         name: serial
 *         required: true
 *         schema:
 *           type: string
 *         description: Serial number of the robot
 *     responses:
 *       200:
 *         description: The robot lift position was successfully changed to UP (MAX)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RobotDto'
 *       400:
 *         description: Bad request
 *       404:
 *         description: Robot not found
 *       500:
 *         description: Failed to change robot lift position
 */
router.post(
  "/robots/:serial/lift-up",
  [param("serial").isString().withMessage("Serial should be a string")],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { serial } = req.params;
    try {
      const robot = await prisma.robot.findUnique({ where: { serial } });
      if (!robot) {
        return res.status(404).json({ error: "Robot not found" });
      }
      if (liftCount == 0) {//가장 처음 불렸을때 jobstask 실행
        const resp = await wsClient.controlWordCall(serial, rosCommandCode.OPERATION_START, '{"name":"lift_manual_control", "direction":"UP"}')
      }
      buttonmsg.count = liftCount;
      buttonmsg.stamp = Date.now() / 1000;
      wsClient.buttonStatePub(buttonmsg);
      liftCount += 1;
      // await controlWordCall(serial, rosCommandCode.OPERATION_START, '{"name":"lift_manual_control", "direction":"UP"}');
      res.json({ message: "success" });
    } catch (error) {
      res.status(500).json({ error: "Failed to change robot lift position" });
    }
  }
);
/**
 * @swagger
 * /robots/{serial}/lift-down:
 *   post:
 *     operationId: setLiftDown
 *     summary: Set robot lift position to DOWN (MIN)
 *     tags: [Robots]
 *     parameters:
 *       - in: path
 *         name: serial
 *         required: true
 *         schema:
 *           type: string
 *         description: Serial number of the robot
 *     responses:
 *       200:
 *         description: The robot lift position was successfully changed to DOWN (MIN)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RobotDto'
 *       400:
 *         description: Bad request
 *       404:
 *         description: Robot not found
 *       500:
 *         description: Failed to change robot lift position
 */
router.post(
  "/robots/:serial/lift-down",
  [param("serial").isString().withMessage("Serial should be a string")],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { serial } = req.params;
    try {
      const robot = await prisma.robot.findUnique({ where: { serial } });
      if (!robot) {
        return res.status(404).json({ error: "Robot not found" });
      }
      if (liftCount == 0) {//가장 처음 불렸을때 jobstask 실행
        const resp = await wsClient.controlWordCall(serial, rosCommandCode.OPERATION_START, '{"name":"lift_manual_control", "direction":"DOWN"}')
      }
      buttonmsg.count = liftCount;
      buttonmsg.stamp = Date.now() / 1000;
      wsClient.buttonStatePub(buttonmsg);
      liftCount += 1;
      res.json({ message: "success" });
    } catch (error) {
      res.status(500).json({ error: "Failed to change robot lift position" });
    }
  }
);
/**
 * @swagger
 * /robots/{serial}/reset-gripper-count:
 *   post:
 *     operationId: resetGripperCount
 *     summary: Reset the robot's gripper count
 *     tags: [Robots]
 *     parameters:
 *       - in: path
 *         name: serial
 *         required: true
 *         schema:
 *           type: string
 *         description: Serial number of the robot
 *     responses:
 *       200:
 *         description: The robot's gripper count was successfully reset
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "success"
 *       400:
 *         description: Bad request
 *       404:
 *         description: Robot not found
 *       500:
 *         description: Failed to reset the robot's gripper count
 */
router.post(
  "/robots/:serial/reset-gripper-count",
  [param("serial").isString().withMessage("Serial should be a string")],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { serial } = req.params;
    try {
      const robot = await prisma.robot.findUnique({ where: { serial } });
      if (!robot) {
        return res.status(404).json({ error: "Robot not found" });
      }
      // 여기에 리프트 카운트를 리셋하는 로직을 추가하십시오.
      gripperCount = 0;
      res.json({ message: "success" });
    } catch (error) {
      res.status(500).json({ error: "Failed to reset robot's gripper count" });
    }
  }
);
/**
 * @swagger
 * /robots/{serial}/gripper-up:
 *   post:
 *     operationId: setGripperUp
 *     summary: Set robot gripper position to UP (MAX)
 *     tags: [Robots]
 *     parameters:
 *       - in: path
 *         name: serial
 *         required: true
 *         schema:
 *           type: string
 *         description: Serial number of the robot
 *     responses:
 *       200:
 *         description: The robot gripper position was successfully changed to UP (MAX)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RobotDto'
 *       400:
 *         description: Bad request
 *       404:
 *         description: Robot not found
 *       500:
 *         description: Failed to change robot gripper position
 */
router.post(
  "/robots/:serial/gripper-up",
  [param("serial").isString().withMessage("Serial should be a string")],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { serial } = req.params;
    try {
      const robot = await prisma.robot.findUnique({ where: { serial } });
      if (!robot) {
        return res.status(404).json({ error: "Robot not found" });
      }
      if (gripperCount == 0) {
        const resp = await wsClient.controlWordCall(serial, rosCommandCode.OPERATION_START, '{"name":"robot_manual_control", "pos":"UP"}')
      }
      buttonmsg.count = gripperCount
      buttonmsg.stamp = Date.now() / 1000;
      wsClient.buttonStatePub(buttonmsg);
      gripperCount += 1
      res.json({ message: "success" });
    } catch (error) {
      res
        .status(500)
        .json({ error: "Failed to change robot gripper position" });
    }
  }
);
/**
 * @swagger
 * /robots/{serial}/gripper-down:
 *   post:
 *     operationId: setGripperDown
 *     summary: Set robot gripper position to DOWN (MIN)
 *     tags: [Robots]
 *     parameters:
 *       - in: path
 *         name: serial
 *         required: true
 *         schema:
 *           type: string
 *         description: Serial number of the robot
 *     responses:
 *       200:
 *         description: The robot gripper position was successfully changed to DOWN (MIN)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RobotDto'
 *       400:
 *         description: Bad request
 *       404:
 *         description: Robot not found
 *       500:
 *         description: Failed to change robot gripper position
 */
router.post(
  "/robots/:serial/gripper-down",
  [param("serial").isString().withMessage("Serial should be a string")],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { serial } = req.params;
    try {
      const robot = await prisma.robot.findUnique({ where: { serial } });
      if (!robot) {
        return res.status(404).json({ error: "Robot not found" });
      }
      if (gripperCount == 0) {
        const resp = await wsClient.controlWordCall(serial, rosCommandCode.OPERATION_START, '{"name":"robot_manual_control", "pos":"DOWN"}')
      }
      buttonmsg.count = gripperCount;
      buttonmsg.stamp = Date.now() / 1000;
      wsClient.buttonStatePub(buttonmsg);
      gripperCount += 1;
      res.json({ message: "success" });
    } catch (error) {
      res
        .status(500)
        .json({ error: "Failed to change robot gripper position" });
    }
  }
);
/**
 * @swagger
 * /robots/{serial}/release-protection:
 *   post:
 *     operationId: releaseProtection
 *     summary: Release robot's protection mode
 *     tags: [Robots]
 *     parameters:
 *       - in: path
 *         name: serial
 *         required: true
 *         schema:
 *           type: string
 *         description: Serial number of the robot
 *     responses:
 *       200:
 *         description: The robot's protection mode was successfully released
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RobotDto'
 *       400:
 *         description: Bad request
 *       404:
 *         description: Robot not found
 *       500:
 *         description: Failed to release the robot's protection mode
 */
router.post(
  "/robots/:serial/release-protection",
  [param("serial").isString().withMessage("Serial should be a string")],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { serial } = req.params;
    try {
      const robot = await prisma.robot.findUnique({ where: { serial } });
      if (!robot) {
        return res.status(404).json({ error: "Robot not found" });
      }
      const resp = await wsClient.controlWordCall(serial, rosCommandCode.CONTROL_RESET_SAFE_STOP, "");
      const resp1 = await wsClient.controlWordCall(serial, rosCommandCode.CONTROL_OPERATION_STOP, "");
      // Add logic here to release the robot's protection mode.
      // Assuming a database field 'protectionMode' exists for the robot entity and setting it to false releases the protection.
      await retry(
        async (bail: Error) => {
          const updatedRobot = await prisma.robot.update({
            where: { serial },
            data: {
              // status: RobotStatus.SERVOON,
              eventAlarmCode: EventAlarmCode.NONE,
            },
          });
          res.json(updatedRobot);
        },
        {
          retries: 10,
          factor: 1,
          minTimeout: 100,
          onRetry: (error: Error, attempt: number) => {
            console.log('Attempt number', attempt, ' failed. Retrying /release-protection: robot.update');
          }
        }
      );
    } catch (error) {
      res
        .status(500)
        .json({ error: "Failed to release the robot's protection mode" });
    }
  }
);
/**
 * @swagger
 * /robots/{serial}/jobEndResume:
 *   post:
 *     operationId: jobEndResume
 *     summary: Send Job End Resume sign
 *     tags: [Robots]
 *     parameters:
 *       - in: path
 *         name: serial
 *         required: true
 *         schema:
 *           type: string
 *         description: Serial number of the robot
 *     responses:
 *       200:
 *         description: Fullstack sent Job End Resume sign to robot
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RobotDto'
 *       400:
 *         description: Bad request
 *       404:
 *         description: Robot not found
 *       500:
 *         description: Failed to release the robot's protection mode
 */
router.post(
  "/robots/:serial/jobEndResume",
  [param("serial").isString().withMessage("Serial should be a string")],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { serial } = req.params;
    try {
      const robot = await prisma.robot.findUnique({ where: { serial } });
      if (!robot) {
        return res.status(404).json({ error: "Robot not found" });
      }
      const resp1 = await wsClient.controlWordCall(serial, rosCommandCode.SYSTEM_POPUP_CLOSED, "END_JOB");
      await retry(
        async (bail: Error) => {
          const updatedRobot = await prisma.robot.update({
            where: { serial },
            data: {
              eventAlarmCode: EventAlarmCode.NONE,
            },
          });
          res.json(updatedRobot);
        },
        {
          retries: 10,
          factor: 1,
          minTimeout: 100,
          onRetry: (error: Error, attempt: number) => {
            console.log('Attempt number', attempt, ' failed. Retrying /jobEndResume: robot.update');
          }
        }
      );
    } catch (error) {
      res
        .status(500)
        .json({ error: "Failed to send Job End sign" });
    }
  }
);
module.exports = router;
// /**
//  * @swagger
//  * /robots/{serial}/logs/check:
//  *   patch:
//  *     summary: Mark all logs for a specific robot as checked
//  *     tags: [Robots, Logs]
//  *     operationId: readAllRobotLogs
//  *     parameters:
//  *       - in: path
//  *         name: serial
//  *         schema:
//  *           type: string
//  *         required: true
//  *         description: The serial of the robot
//  *     responses:
//  *       200:
//  *         description: Logs marked as checked successfully
//  *       400:
//  *         description: Bad request
//  *       404:
//  *         description: Robot not found
//  *       500:
//  *         description: Server error
//  */
// router.patch(
//   "/robots/:serial/logs/check",
//   [param("serial").isString().withMessage("Serial must be a string")],
//   async (req: Request, res: Response) => {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//       return res.status(400).json({ errors: errors.array() });
//     }
//     const { serial } = req.params;
//     try {
//       // Verify the robot exists
//       const robot = await prisma.robot.findUnique({
//         where: {
//           serial,
//         },
//       });
//       if (!robot) {
//         return res
//           .status(404)
//           .json({ error: "Robot with the given serial does not exist" });
//       }
//       // Mark all logs for this robot as checked
//       const logs = await prisma.log.updateMany({
//         where: {
//           robotId: robot.id,
//           checked: false,
//         },
//         data: {
//           checked: true,
//         },
//       });
//       return res.status(200).json(logs);
//     } catch (error) {
//       console.error(error);
//       res.status(500).json({ error: "An error occurred while updating logs" });
//     }
//   }
// );