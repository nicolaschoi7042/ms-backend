import express, { Request, Response, Router } from "express";
import { body, param, validationResult } from "express-validator";
import { prisma } from "../utils/prisma";
import {updateJobInfo} from "../services/jobs.service";

const router: Router = express.Router();

/**
 * @swagger
 * /box-positions/{date}:
 *   get:
 *     summary: gets list of box positions after a certain date
 *     tags: [BoxPositions]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: The BoxPosition ID
 *     responses:
 *       201:
 *         description: The created BoxPosition
 *       400:
 *         description: Bad request
 *       500:
 *         description: Server error
 */

router.get("/box-positions/:date", async (req: Request, res: Response) => {
  const { date } = req.params;
  const data_object = new Date(date);
  console.log(data_object);
  try{
    const boxPositions = await prisma.boxPosition.findMany({
      where: {
        createdAt: {
          gte: data_object,
          // lt: new Date(date),
        },
      },
      distinct: ['boxBarcode'],
      select:{
        boxBarcode: true,
      }
    });
    console.log(boxPositions);
    res.status(201).json(boxPositions);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "An error occurred while getting the box position" });
  }
  
});

/**
 * @swagger
 * /box-positions:
 *   post:
 *     summary: Create a new BoxPosition
 *     tags: [BoxPositions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateBoxPositionDto'
 *     responses:
 *       201:
 *         description: The created BoxPosition
 *       400:
 *         description: Bad request
 *       500:
 *         description: Server error
 */
router.post(
  "/box-positions",
  [
    body("jobId").isInt(),
    body("x").isFloat(),
    body("y").isFloat(),
    body("z").isFloat(),
    body("width").isFloat(),
    body("height").isFloat(),
    body("length").isFloat(),
    body("boxName").isString(),
    body("boxBarcode").isString(),
    body("loadingOrder").isFloat(),
    body("isLoading").isBoolean(),
    body("rotationType").optional().isInt(),
    body("boxId").optional().isString(),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // validate jobId
    const jobId = req.body.jobId;
    const job = await prisma.job.findUnique({
      where: { id: jobId },
    });
    if (!job) {
      return res.status(400).json({ error: "Job not found" });
    }

    const boxPositionData = req.body;

    try {
      const newBoxPosition = await prisma.boxPosition.create({
        data: boxPositionData,
      });

      res.status(201).json(newBoxPosition);
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ error: "An error occurred while creating the box position" });
    }
  }
);

/**
 * @swagger
 * /box-positions/{id}:
 *   put:
 *     summary: Update an existing BoxPosition
 *     tags: [BoxPositions]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: The BoxPosition ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateBoxPositionDto'
 *     responses:
 *       200:
 *         description: The updated BoxPosition
 *       400:
 *         description: Bad request
 *       404:
 *         description: BoxPosition not found
 *       500:
 *         description: Server error
 */
router.put(
  "/box-positions/:id",
  [
    body("x").optional().isFloat(),
    body("y").optional().isFloat(),
    body("z").optional().isFloat(),
    body("width").optional().isFloat(),
    body("height").optional().isFloat(),
    body("length").optional().isFloat(),
    body("boxName").optional().isString(),
    body("boxBarcode").optional().isString(),
    body("loadingOrder").optional().isFloat(),
    body("isLoading").optional().isBoolean(),
    body("rotationType").optional().isInt(),
    body("boxId").optional().isString(),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const boxPositionId = req.params.id;
    const updateData = req.body;

    try {
      const updatedBoxPosition = await prisma.boxPosition.update({
        where: { id: parseInt(boxPositionId, 10) },
        data: updateData,
      });

      res.json(updatedBoxPosition);
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ error: "An error occurred while updating the box position" });
    }
  }
);

/**
 * @swagger
 * /box-positions/{id}/un-loading:
 *   patch:
 *     summary: Mark a BoxPosition as unloaded
 *     tags: [BoxPositions]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: The BoxPosition ID
 *     responses:
 *       200:
 *         description: The BoxPosition was successfully updated to unloaded state
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BoxPositionDto'
 *       400:
 *         description: Bad request
 *       404:
 *         description: BoxPosition not found
 *       500:
 *         description: Server error
 */
router.patch(
  "/box-positions/:id/un-loading",
  [param("id").isInt().withMessage("boxPosition must be an integer").toInt()],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    try {
      const boxPosition = await prisma.boxPosition.findUnique({
        where: { id: Number(id) },
      });
      if (!boxPosition) {
        res.status(404).json({ error: "BoxPosition not found" });
        return;
      }
      const { id: boxPositionId, loadingOrder, ...rest } = boxPosition;
      const { jobId } = rest;
      const job = await prisma.job.findUnique({
        where: { id: jobId },
        include: {
          _count: {
            select: { boxPositions: true },
          },
        },
      });
      if (!job) {
        res.status(404).json({ error: "Job not found" });
        return;
      }
      const createdBoxPosition = await prisma.boxPosition.create({
        data: {
          ...rest,
          isLoading: false,
          loadingOrder: job._count.boxPositions,
        },
      });
      updateJobInfo(jobId);
      // ROBOE: 수동으로 박스 제거
      res.status(200).json(createdBoxPosition);
    } catch (error) {
      console.error("🚀 ~ file: boxPositions.ts:301 ~ error:", error);
      res.status(500).json({ error: "Failed to unload BoxPosition" });
    }
  }
);

module.exports = router;
