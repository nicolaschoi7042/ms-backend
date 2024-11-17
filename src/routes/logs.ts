import express, { Request, Response, Router } from "express";
import { body, param, query, validationResult } from "express-validator";
import { Category, Level } from "../constants/logConstants";
import { prisma } from "../utils/prisma";
import {
  rosCommandCode,
} from "../constants/robotConstants";
import wsClient from "../websocket/websocketClient";

const router: Router = express.Router();

const VALID_CATEGORIES = Object.values(Category);
const VALID_LEVELS = Object.values(Level);

/**
 * @swagger
 * components:
 *   schemas:
 *     LogDto:
 *       type: object
 *       required:
 *        - id
 *        - category
 *        - message_key
 *        - param
 *        - level
 *        - createdAt
 *        - updatedAt
 *       properties:
 *         id:
 *           type: integer
 *         category:
 *           type: integer
 *           description: |
 *             The category of the log, represented by an integer.
 *             Possible values are:
 *             0 - VISION
 *             1 - ARM
 *             2 - MOBILE
 *             3 - ALGORITHM
 *             4 - GRIPPER
 *             5 - FRAMEWORK
 *         message_key:
 *           type: integer
 *         param:
 *           type: string
 *         level:
 *           type: integer
 *           description: |
 *             The level of the log, represented by an integer.
 *             Possible values are:
 *             0 - INFO
 *             1 - WARNING
 *             2 - ERROR
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *
 *     CreateLogDto:
 *       type: object
 *       required:
 *        - category
 *        - message_key
 *        - level
 *        - robotSerial
 *       properties:
 *         category:
 *           type: integer
 *           description: |
 *             The category of the log, represented by an integer.
 *             Possible values are:
 *             0 - VISION
 *             1 - ARM
 *             2 - MOBILE
 *             3 - ALGORITHM
 *             4 - GRIPPER
 *             5 - FRAMEWORK
 *         message_key:
 *           type: integer
 *         param:
 *           type: string
 *         level:
 *           type: integer
 *           description: |
 *             The level of the log, represented by an integer.
 *             Possible values are:
 *             0 - INFO
 *             1 - WARNING
 *             2 - ERROR
 *         robotSerial:
 *           type: string
 */

/**
 * @swagger
 * /logs:
 *   get:
 *     summary: Retrieve a list of logs
 *     tags: [Logs]
 *     parameters:
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
 *         name: robotSerial
 *         required: true
 *         schema:
 *           type: string
 *         description: The serial number of the robot to retrieve logs for
 *       - in: query
 *         name: level
 *         schema:
 *           type: integer
 *         description: The log level to filter logs by (optional)
 *     responses:
 *       200:
 *         description: A list of logs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - items
 *                 - pagination
 *               properties:
 *                 items:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/LogDto'
 *                 pagination:
 *                   $ref: '#/components/schemas/PaginationDto'
 *       400:
 *         description: Bad request
 *       500:
 *         description: Server error
 */
router.get(
  "/logs",
  [
    query("page").optional().isInt({ min: 1 }),
    query("pageSize").optional().isInt({ min: 5 }),
    query("robotSerial")
      .isString()
      .withMessage("Robot serial must be a string"),
    query("level").optional().isInt().withMessage("Level must be a string"),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 10;
    // const level = +(req.query.level as string) ?? undefined;
    let level;
    if (req.query.level != null) {
      level = +(req.query.level as string);
    } else {
      level = undefined;
    }

    try {
      const robot = await prisma.robot.findUnique({
        where: {
          serial: req.query.robotSerial as string,
        },
      });

      if (!robot) {
        return res
          .status(400)
          .json({ error: "Robot with given serial does not exist" });
      }

      const logs = await prisma.log.findMany({
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: {
          createdAt: "desc",
        },
        where: {
          robotId: robot.id,
          ...((!!level || level === 0) && { level }),
        },
      });

      const totalItemCount = await prisma.log.count({
        where: {
          robotId: robot.id,
          ...((!!level || level === 0) && { level }),
        },
      });
      const totalPage = Math.ceil(totalItemCount / pageSize);
      const currentItemCount = logs.length;

      const response = {
        items: logs,
        pagination: {
          totalItemCount,
          currentItemCount,
          totalPage,
          currentPage: page,
          itemsPerPage: pageSize,
        },
      };
      return res.status(200).json(response);
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ error: "An error occurred while retrieving logs" });
    }
  }
);

/**
 * @swagger
 * /logs:
 *   post:
 *     summary: Create a new log
 *     tags: [Logs]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateLogDto'
 *     responses:
 *       201:
 *         description: The created log
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LogDto'
 *       400:
 *         description: Bad request
 *       500:
 *         description: Server error
 */
router.post(
  "/logs",
  [
    body("category")
      .isInt()
      .withMessage("Category must be an integer")
      .isIn(VALID_CATEGORIES)
      .withMessage(`Category must be one of ${VALID_CATEGORIES.join(", ")}`),
    body("message_key").isInt().withMessage("Message_key must be an integer"),
    body("param").optional().isString().withMessage("Param must be a string"),
    body("level")
      .isInt()
      .withMessage("Level must be an integer")
      .isIn(VALID_LEVELS)
      .withMessage(`Level must be one of ${VALID_LEVELS.join(", ")}`),
    body("robotSerial").isString().withMessage("Robot serial must be a string"),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { category, message_key, param, level, robotSerial } = req.body;

      const robot = await prisma.robot.findUnique({
        where: {
          serial: robotSerial,
        },
      });

      if (!robot) {
        return res
          .status(400)
          .json({ error: "Robot with given serial does not exist" });
      }

      const log = await prisma.log.create({
        data: { category, message_key, param, level, robotId: robot.id },
      });

      res.status(201).json({ ...log, robotSerial: robot.serial });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "An error occurred while creating a log" });
    }
  }
);

/**
 * @swagger
 * /logs/{id}/check:
 *   patch:
 *     summary: Set the check field of a log to true
 *     tags: [Logs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the log to update
 *     responses:
 *       200:
 *         description: The updated log
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LogDto'
 *       400:
 *         description: Bad request
 *       404:
 *         description: Log not found
 *       500:
 *         description: Server error
 */
router.patch(
  "/logs/:id/check",
  [
    param("id").isInt().withMessage("Log ID must be an integer").toInt(), // Convert the string ID to integer for further use
  ],
  async (req: Request, res: Response) => {
    const robots = await prisma.robot.findMany();
    const robot = robots[0];
    const serial = robot?.serial;

    const resp1 = await wsClient.controlWordCall(serial, rosCommandCode.SYSTEM_POPUP_CLOSED, "END_JOB");

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const logId = +req.params.id;
    const log = await prisma.log.findUnique({
      where: { id: logId },
    });
    if (!log) {
      return res.status(404).json({ error: "Log not found" });
    }

    try {
      const log = await prisma.log.update({
        where: { id: logId },
        data: { checked: true },
      });

      if (!log) {
        return res.status(404).json({ error: "Log not found" });
      }

      return res.status(200).json(log);
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({ error: "An error occurred while updating the log" });
    }
  }
);

module.exports = router;
