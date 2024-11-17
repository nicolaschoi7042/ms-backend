import express, { Request, Response, Router } from "express";
import { param, query, validationResult } from "express-validator";
import { filter, groupBy, map, maxBy } from "lodash";
import { prisma } from "../utils/prisma";
import {updateJobInfo} from "../services/jobs.service";

const router: Router = express.Router();

/**
 * @swagger
 * /job-pallets/{id}:
 *   get:
 *     summary: Get a JobPallet by ID
 *     tags: [JobPallets]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the JobPallet
 *     responses:
 *       200:
 *         description: The requested JobPallet
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/JobPalletDto'
 *       404:
 *         description: JobPallet not found
 */
router.get(
  "/job-pallets/:id",
  [param("id").isInt().withMessage("jobPalletID must be an integer").toInt()],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    try {
      const jobPallet = await prisma.jobPallet.findUnique({
        where: { id: Number(id) },
      });
      if (jobPallet) {
        res.json(jobPallet);
      } else {
        res.status(404).json({ error: "JobPallet not found" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to retrieve JobPallet" });
    }
  }
);

/**
 * @swagger
 * /job-pallets/{id}/box-position:
 *   get:
 *     summary: Retrieve box positions associated with a specific Job Pallet by ID
 *     tags: [JobPallets]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the job pallet
 *       - in: query
 *         name: boxBarcode
 *         required: false
 *         schema:
 *           type: string
 *         description: An optional box barcode prefix to filter the box positions (startsWith filter)
 *     responses:
 *       200:
 *         description: A list of box positions associated with the job pallet.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/BoxPositionDto'
 *       400:
 *         description: Bad request, possible validation errors.
 *       404:
 *         description: Job pallet not found.
 *       500:
 *         description: Server error, failed to retrieve job pallet.
 */
router.get(
  "/job-pallets/:id/box-position",
  [
    param("id").isInt().withMessage("jobPalletID must be an integer").toInt(),
    query("boxBarcode")
      .optional()
      .isString()
      .withMessage("boxBarcode must be a string"),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    try {
      const jobPallet = await prisma.jobPallet.findUnique({
        where: { id: Number(id) },
      });
      if (!jobPallet) {
        res.status(404).json({ error: "JobPallet not found" });
        return;
      }
      const { jobId } = jobPallet;
      const { boxBarcode } = req.query;
      const boxPosition = await prisma.boxPosition.findMany({
        where: {
          jobId: Number(jobId),
          boxBarcode: {
            contains: boxBarcode as string,
          },
        },
        orderBy: {
          loadingOrder: "desc",
        },
      });
      const groupByBoxBarcode = groupBy(boxPosition, "boxBarcode");
      const filteredBoxPosition = map(groupByBoxBarcode, (value, key) => {
        if (value.length % 2 == 0) {
          return null;
        }
        const loadingBoxPosition = filter(value, { isLoading: true });
        const lastBoxPosition = maxBy(loadingBoxPosition, "loadingOrder");
        return lastBoxPosition;
      }).filter((value) => !!value);
      res.status(200).json(filteredBoxPosition);
    } catch (error) {
      res.status(500).json({ error: "Failed to retrieve JobPallet" });
    }
  }
);

/**
 * @swagger
 * /job-pallets/{id}/box-position:
 *   delete:
 *     summary: Delete all box positions associated with a specific Job Pallet by ID
 *     tags: [JobPallets]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the job pallet
 *     responses:
 *       200:
 *         description: Box positions successfully deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count:
 *                   type: integer
 *                 description: The number of deleted box positions
 *       400:
 *         description: Bad request, possible validation errors.
 *       404:
 *         description: Job pallet not found.
 *       500:
 *         description: Server error, failed to delete box positions.
 */
router.delete(
  "/job-pallets/:id/box-position",
  [param("id").isInt().withMessage("jobPalletID must be an integer").toInt()],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    try {
      const jobPallet = await prisma.jobPallet.findUnique({
        where: { id: Number(id) },
      });
      if (!jobPallet) {
        res.status(404).json({ error: "JobPallet not found" });
        return;
      }
      const { jobId } = jobPallet;
      const boxPosition = await prisma.boxPosition.deleteMany({
        where: {
          jobId: Number(jobId),
        },
      });
      updateJobInfo(jobId);
      // ROBOE: 작업 정보 전체 삭제
      res.status(200).json(boxPosition);
    } catch (error) {
      res.status(500).json({ error: "Failed to retrieve JobPallet" });
    }
  }
);

/**
 * @swagger
 * /job-pallets/{id}/finish:
 *   post:
 *     summary: Finish a Job Pallet by ID
 *     description: Marks the job pallet specified by ID as finished and sets the end time to the current time.
 *     tags: [JobPallets]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the JobPallet to be finished
 *     responses:
 *       200:
 *         description: Job Pallet successfully finished
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/JobDto'
 *       400:
 *         description: Bad request, possible validation errors
 *       404:
 *         description: JobPallet not found
 *       500:
 *         description: Server error, failed to finish JobPallet
 */
router.post(
  "/job-pallets/:id/finish",
  [param("id").isInt().withMessage("jobPalletID must be an integer").toInt()],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { id } = req.params;
    try {
      const jobPallet = await prisma.jobPallet.findUnique({
        where: { id: Number(id) },
        include: {
          job: true,
        },
      });
      if (!jobPallet) {
        res.status(404).json({ error: "JobPallet not found" });
        return;
      }
      await prisma.job.update({
        where: {
          id: jobPallet.jobId,
        },
        data: {
          endedAt: new Date(),
          endFlag: true,
        },
      });
      // ROBOE: 수동 적재 완료
      res.status(200).json({
        message: "Job Pallet successfully finished",
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to retrieve JobPallet" });
    }
  }
);

module.exports = router;
