import express, { Request, Response, Router } from "express";
import { prisma } from "../utils/prisma";
const router: Router = express.Router();

/**
 * @swagger
 * /job-groups/{jobGroupId}:
 *   get:
 *     summary: Retrieve a specific job by its ID
 *     tags: [JobGroups]
 *     parameters:
 *       - in: path
 *         name: jobGroupId
 *         schema:
 *           type: integer
 *         required: true
 *         description: The job ID
 *     responses:
 *       200:
 *         description: The retrieved job
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/JobGroupDto'
 *       404:
 *         description: Job not found
 *       500:
 *         description: Server error
 */
router.get("/job-groups/:jobGroupId", async (req: Request, res: Response) => {
  const jobGroupId = Number(req.params.jobGroupId);

  try {
    const job = await prisma.jobGroup.findUnique({
      where: { id: jobGroupId },
      include: {
        jobs: {
          include: {
            jobPallet: true,
          },
        },
      },
    });

    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    res.status(200).json(job);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "An error occurred while retrieving the job" });
  }
});

module.exports = router;
