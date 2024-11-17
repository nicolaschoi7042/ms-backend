import express, { Request, Response, Router } from "express";
import { body, checkSchema, validationResult } from "express-validator";
import { ValidationError } from "../types/error";
import { stringify } from "csv-stringify";
import { formatInTimeZone } from "date-fns-tz";
import { ko } from "date-fns/locale";
import { prisma } from "../utils/prisma";
import { IContinueJobDto, ICrateJobDto } from "../components/job.dto";
import { EventAlarmCode } from "../constants/robotConstants";

const router: Router = express.Router();

const jobSchema = {
  palletGroupId: {
    errorMessage: "palletGroupId is required and should be a number",
    isNumeric: true,
    exists: true,
  },
  robotSerial: {
    errorMessage: "robotSerial is required and should be a string",
    isString: true,
    exists: true,
  },
  ".*.pallets.id": {
    errorMessage: "id is required and should be a string",
    isString: true,
    exists: true,
  },
  ".*.pallets.palletBarcode": {
    errorMessage: "palletBarcode is required and should be a string",
    isString: true,
    exists: false,
  },
};

/**
 * @swagger
 * /jobs:
 *   post:
 *     summary: Create new jobs
 *     tags: [Jobs]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *               $ref: '#/components/schemas/CreateJobDto'
 *     responses:
 *       201:
 *         description: The created jobs
 *       400:
 *         description: Bad request
 *       500:
 *         description: Server error
 */
router.post(
  "/jobs",
  checkSchema(jobSchema, ["body"]),
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { robotSerial, pallets, enableConcurrent, palletGroupId } = req.body as ICrateJobDto;

    try {
      // validate robotSerial
      const robots = await prisma.robot.findMany();
      const robot = robots[0];
      // const serial = robot?.serial;
      // const robot = await prisma.robot.findUnique({
      //   where: { serial: robotSerial },
      // });
      if (!robot) {
        throw new ValidationError("Invalid robotSerial");
      }
      // validate pallets
      const palletIds = pallets.map((pallet) => pallet.id);
      const existingPallets = await prisma.pallet.findMany({
        where: { id: { in: palletIds } },
      });
      if (existingPallets.length !== pallets.length) {
        throw new ValidationError("Invalid pallets");
      }

      const existingPalletGroup = await prisma.palletGroup.findUnique({
        where: { id: palletGroupId },
      });
      if (!existingPalletGroup) {
        throw new ValidationError("Invalid palletGroupId");
      }

      await prisma.$transaction(async (prisma) => {
        const newJobGroup = await prisma.jobGroup.create({
          data: {
            name: existingPalletGroup.name,
            location: existingPalletGroup.location,
            enableConcurrent: enableConcurrent,
          },
        });
        for (const pallet of existingPallets) {
          const findPallet = pallets.find((p) => p.id === pallet.id);
          let loadingPatternName;
          let createPalletSpecification = {};
          const {
            isBuffer,
            isUse,
            isError,
            location,
            isInvoiceVisible,
            loadingHeight,
            orderInformation,
            loadingPatternId,
            palletSpecificationId,
            boxGroupId,
          } = pallet;
          let boxGroupName;
          if (boxGroupId) {
            const boxGroup = await prisma.boxGroup.findUnique({
              where: { id: boxGroupId },
            });
            if (!boxGroup) {
              throw new ValidationError("Invalid boxGroupId");
            }
            boxGroupName = boxGroup.name;
          }

          if (loadingPatternId) {
            const loadingPattern = await prisma.loadingPattern.findUnique({
              where: { id: loadingPatternId },
            });
            if (!loadingPattern) {
              throw new ValidationError("Invalid loadingPatternId");
            }
            loadingPatternName = loadingPattern.name;
          }

          if (palletSpecificationId) {
            const palletSpecification =
              await prisma.palletSpecification.findUnique({
                where: { id: palletSpecificationId },
              });

            if (!palletSpecification) {
              throw new ValidationError("Invalid palletSpecificationId");
            }
            createPalletSpecification = {
              width: palletSpecification.width,
              height: palletSpecification.height,
              length: palletSpecification.length,
              palletSpecName: palletSpecification.name,
              overhang: palletSpecification.overhang,
            };
          }
          const defaultBoxList = '[{"name":"DEFAULT","width":0,"height":0,"length":0,"weight":0,"labelDirection":0,"jobId":0}]';

          // Create Job
          const newJob = await prisma.job.create({
            data: {
              robotId: robot.id,
              jobGroupId: newJobGroup.id,
              jobBoxes: isUse ? "" : defaultBoxList
            },
          });
          // Create JobPallet
          await prisma.jobPallet.create({
            data: {
              jobId: newJob.id,
              isBuffer,
              isUse,
              isError,
              location,
              isInvoiceVisible,
              loadingHeight,
              orderInformation,
              palletBarcode: findPallet?.palletBarcode,
              loadingPatternName,
              boxGroupName,
              ...createPalletSpecification,
            },
          });

          // Create JobBoxes if any
          if (boxGroupId) {
            const existingBoxGroup = await prisma.boxGroup.findUnique({
              where: { id: boxGroupId },
            });
            if (!existingBoxGroup) {
              throw new ValidationError("Invalid boxGroupId");
            }
            const boxes = await prisma.box.findMany({
              where: { boxGroupId },
            });
            const insertBoxes = [];
            for (const jobBox of boxes) {
              let barcodeType = {};
              const {
                name,
                width,
                height,
                length,
                weight,
                labelDirection,
                barcodeTypeId,
              } = jobBox;
              if (barcodeTypeId) {
                const existingBarcodeType = await prisma.barcodeType.findUnique(
                  {
                    where: { id: barcodeTypeId },
                  }
                );
                if (!existingBarcodeType) {
                  throw new ValidationError("Invalid barcodeTypeId");
                }
                barcodeType = {
                  barcodeTypeName: existingBarcodeType.name,
                  barcodeSampleData: existingBarcodeType.sampleData,
                  barcodeWeightLocation: existingBarcodeType.weightLocation,
                  barcodeUnit: existingBarcodeType.unit,
                  barcodeDigits: existingBarcodeType.digits,
                };
              }
              insertBoxes.push({
                name,
                width,
                height,
                length,
                weight,
                labelDirection,
                jobId: newJob.id,
                ...barcodeType,
              });
            }

            await prisma.job.update({
              where: { id: newJob.id },
              data: {
                jobBoxes: JSON.stringify(insertBoxes),
              },
            });
          }
        }
      });

      res
        .status(201)
        .json({ message: "Jobs and JobPallets created successfully" });
    } catch (error) {
      console.error(error);
      if (error instanceof ValidationError) {
        // 유효성 검사 에러에 대한 처리
        res.status(400).json({ error: error.message });
      } else {
        // 기타 에러에 대한 처리
        res.status(500).json({
          error: "An error occurred while creating the jobs and jobPallets",
        });
      }
    }
  }
);

const continueJobSchema = {
  robotSerial: {
    errorMessage: "robotSerial is required and should be a string",
    isString: true,
    exists: true,
  },
  ".*.pallets.id": {
    errorMessage: "id is required and should be a string",
    isString: true,
    exists: true,
  },
  ".*.pallets.palletBarcode": {
    errorMessage: "palletBarcode is required and should be a string",
    isString: true,
    exists: false,
  },
};

/**
 * @swagger
 * /jobs/continue:
 *   post:
 *     summary: Continue new jobs
 *     tags: [Jobs]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *               $ref: '#/components/schemas/ContinueJobDto'
 *     responses:
 *       201:
 *         description: The continue jobs
 *       400:
 *         description: Bad request
 *       500:
 *         description: Server error
 */
router.post(
  "/jobs/continue",
  checkSchema(continueJobSchema, ["body"]),
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { robotSerial, enableConcurrent, jobPallets } = req.body as IContinueJobDto;

    try {
      // validate robotSerial
      // const robot = await prisma.robot.findUnique({
      //   where: { serial: robotSerial },
      // });
      const robots = await prisma.robot.findMany();
      const robot = robots[0];
      if (!robot) {
        throw new ValidationError("Invalid robotSerial");
      }
      // validate pallets
      const palletIds = jobPallets.map((pallet) => pallet.id);
      const existingJobPallets = await prisma.jobPallet.findMany({
        where: { id: { in: palletIds } },
      });
      if (existingJobPallets.length !== jobPallets.length) {
        throw new ValidationError("Invalid jobPallets");
      }

      await prisma.$transaction(async (prisma) => {
        let jobGroupId: number = 0;
        for (const jobPallet of existingJobPallets) {
          const findJobPallet = jobPallets.find((p) => p.id === jobPallet.id);
          const job = await prisma.job.findUnique({
            where: { id: jobPallet.jobId },
          });
          if (!job) {
            throw new ValidationError("Invalid jobId");
          }
          
          jobGroupId = job.jobGroupId;

          if (!job.endFlag || !job.endedAt) {
            continue;
          }
          const newJob = await prisma.job.create({
            data: {
              robotId: robot.id,
              jobGroupId: job.jobGroupId,
              jobBoxes: job.jobBoxes,
            },
          });
          const { id, createdAt, updatedAt, ...rest } = jobPallet;
          await prisma.jobPallet.create({
            data: {
              ...rest,
              jobId: newJob.id,
              palletBarcode: findJobPallet?.palletBarcode,
            },
          });
        }
        await prisma.jobGroup.update({
          where: { id: jobGroupId },
          data: {
            enableConcurrent: enableConcurrent,
          }
        });
      });

      res
        .status(201)
        .json({ message: "Jobs and JobPallets created successfully" });
    } catch (error) {
      console.error(error);
      if (error instanceof ValidationError) {
        // 유효성 검사 에러에 대한 처리
        res.status(400).json({ error: error.message });
      } else {
        // 기타 에러에 대한 처리
        res.status(500).json({
          error: "An error occurred while creating the jobs and jobPallets",
        });
      }
    }
  }
);

// Update an existing Job
/**
 * @swagger
 * /jobs/{id}:
 *   put:
 *     summary: Update an existing job
 *     tags: [Jobs]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: The job ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateJobDto'
 *     responses:
 *       200:
 *         description: The updated job
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/JobDto'
 *       400:
 *         description: Bad request
 *       404:
 *         description: Job not found
 *       500:
 *         description: Server error
 */
router.patch(
  "/jobs/:id",
  [
    body("endedAt").optional().isISO8601(),
    body("loadingRate").optional().isFloat(),
    body("bph").optional().isFloat(),
    body("currentLoadHeight").optional().isFloat(),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const id = Number(req.params.id);
    const jobData = req.body;

    try {
      const updatedJob = await prisma.job.update({
        where: { id },
        data: jobData,
      });
      res.status(200).json(updatedJob);
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ error: "An error occurred while updating the job" });
    }
  }
);

/**
 * @swagger
 * /jobs/{jobid}:
 *   get:
 *     summary: Retrieve a specific job by its ID
 *     tags: [Jobs]
 *     parameters:
 *       - in: path
 *         name: jobid
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
 *               $ref: '#/components/schemas/JobDto'
 *       404:
 *         description: Job not found
 *       500:
 *         description: Server error
 */
router.get("/jobs/:jobid", async (req: Request, res: Response) => {
  const jobId = Number(req.params.jobid);

  try {
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        jobPallet: true,
        boxPositions: true,
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

/**
 * @swagger
 * /jobs/{jobid}/box-positions/csv:
 *   get:
 *     summary: Download box positions of a specific job as a CSV file
 *     tags: [Jobs]
 *     parameters:
 *       - in: path
 *         name: jobid
 *         schema:
 *           type: integer
 *         required: true
 *         description: The job ID
 *     responses:
 *       200:
 *         description: CSV file of box positions
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *               example: |
 *                 CHUTE_NO,ORDER_GROUP,PALLET_ID,BOX_ID,BOX_TYPE,LOADING_TIME
 *                 101,groupA,P12345,B98765,Type1,2023-08-21 14:00:00
 *                 102,groupB,P12346,B98766,Type2,2023-08-21 14:05:00
 *       404:
 *         description: Job not found
 *       500:
 *         description: Server error
 */
router.get(
  "/jobs/:jobid/box-positions/csv",
  async (req: Request, res: Response) => {
    const jobId = Number(req.params.jobid);

    try {
      const boxPositions = await prisma.boxPosition.findMany({
        where: {
          jobId,
          isLoading: true,
          boxName: {
            not: {
              equals: "ghost",
            },
          },
        },
        select: {
          boxBarcode: true,
          boxName: true,
          isLoading: true,
          updatedAt: true,
          job: {
            select: {
              jobPallet: {
                select: {
                  palletBarcode: true,
                },
              },
            },
          },
        },
      });

      const csvData = boxPositions.map((boxPosition) => {
        const {
          job: { jobPallet },
          boxBarcode,
          boxName,
          updatedAt,
        } = boxPosition;
        const { palletBarcode } = jobPallet || {};
        return {
          PALLET_ID: palletBarcode,
          BOX_ID: boxBarcode,
          BOX_TYPE: boxName,
          LOADING_TIME: formatInTimeZone(
            new Date(updatedAt),
            "Asia/Seoul",
            "yyyy-MM-dd HH:mm:ss",
            { locale: ko }
          ),
        };
      });

      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="box_positions_${jobId}.csv"`
      );
      stringify(csvData, { header: true }).pipe(res);
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ error: "An error occurred while generating the CSV file" });
    }
  }
);

module.exports = router;
