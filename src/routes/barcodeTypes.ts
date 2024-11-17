import express, { Request, Response, Router } from "express";
import { prisma } from "../utils/prisma";
import { body, validationResult } from "express-validator";

const router: Router = express.Router();

/**
 * @swagger
 * /barcode-types:
 *   get:
 *     summary: Retrieve a list of barcode types
 *     tags: [Barcode-types]
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/BarcodeTypeDto'
 */
router.get("/barcode-types", async (req: Request, res: Response) => {
  try {
    const barcodeTypes = await prisma.barcodeType.findMany();
    res.json(barcodeTypes);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "An error occurred while retrieving barcode types" });
  }
});

/**
 * @swagger
 * /barcode-types:
 *   post:
 *     summary: Create multiple new barcode types
 *     tags: [Barcode-types]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *            $ref: '#/components/schemas/BulkCreateAndUpdateTypeDto'
 *     responses:
 *       201:
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 'Barcode types created successfully'
 */
router.post(
  "/barcode-types",
  [
    body("barcodeTypes").isArray(),
    body("barcodeTypes.*.id").optional().isInt(),
    body("barcodeTypes.*.name").isString().notEmpty(),
    body("barcodeTypes.*.sampleData").isString().notEmpty(),
    body("barcodeTypes.*.productCodeLocation").isString().notEmpty(),
    body("barcodeTypes.*.weightLocation").isString().notEmpty(),
    body("barcodeTypes.*.unit")
      .optional({
        values: "null",
      })
      .isString(),
    body("barcodeTypes.*.digits")
      .optional({
        values: "null",
      })
      .isInt(),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { barcodeTypes } = req.body;
      const invalidIds = [];
      const operations = [];

      for (const barcodeType of barcodeTypes) {
        if (!barcodeType.id) {
          const { id, ...data } = barcodeType;
          operations.push(
            prisma.barcodeType.create({
              data: data,
            })
          );
          continue;
        }
        const exists = await prisma.barcodeType.findUnique({
          where: { id: barcodeType.id },
        });
        if (exists) {
          operations.push(
            prisma.barcodeType.update({
              where: { id: barcodeType.id },
              data: barcodeType,
            })
          );
          continue;
        }
        invalidIds.push(barcodeType.id); // Collect invalid IDs
      }

      if (invalidIds.length > 0) {
        return res
          .status(400)
          .json({ message: "Some updates failed, invalid IDs", invalidIds });
      }

      // Perform transaction only if there are operations to execute
      if (operations.length > 0) {
        await prisma.$transaction(operations);
        res
          .status(201)
          .json({ message: "Barcode types processed successfully" });
      } else {
        res.status(400).json({ message: "No valid operations to perform" });
      }
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ error: "An error occurred while processing barcode types" });
    }
  }
);

/**
 * @swagger
 * /barcode-types/{id}:
 *   get:
 *     summary: Get a barcode type by ID
 *     tags: [Barcode-types]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BarcodeTypeDto'
 */
router.get("/barcode-types/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const barcodeType = await prisma.barcodeType.findUnique({
      where: { id: Number(id) },
    });

    if (barcodeType) {
      res.json(barcodeType);
    } else {
      res.status(404).json({ error: "Barcode type not found" });
    }
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "An error occurred while retrieving the barcode type" });
  }
});

/**
 * @swagger
 * /barcode-types/{id}:
 *   delete:
 *     summary: Delete a barcode type by ID
 *     tags: [Barcode-types]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 */
router.delete("/barcode-types/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.barcodeType.delete({
      where: { id: Number(id) },
    });
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "An error occurred while deleting the barcode type" });
  }
});

module.exports = router;
