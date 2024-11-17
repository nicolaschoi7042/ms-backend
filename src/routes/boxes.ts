import express, { Request, Response, Router } from "express";
import { prisma } from "../utils/prisma";

const router: Router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     BoxDto:
 *       type: object
 *       required:
 *        - id
 *        - name
 *        - width
 *        - height
 *        - length
 *        - boxGroupId
 *        - weight
 *       properties:
 *         id:
 *           type: string
 *         name:
 *           type: string
 *         width:
 *           type: number
 *         height:
 *           type: number
 *         length:
 *           type: number
 *         weight:
 *           type: number
 *         labelDirection:
 *           type: number
 *         barcodeType:
 *           type: number
 *         boxGroupId:
 *           type: integer
 *
 *     CreateBoxDto:
 *       type: object
 *       required:
 *        - name
 *        - width
 *        - height
 *        - length
 *        - weight
 *       properties:
 *         name:
 *           type: string
 *         width:
 *           type: number
 *         height:
 *           type: number
 *         length:
 *           type: number
 *         weight:
 *           type: number
 *         labelDirection:
 *           type: number
 *         barcodeTypeId:
 *           type: number
 *     UpdateBoxDto:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *         width:
 *           type: number
 *         height:
 *           type: number
 *         length:
 *           type: number
 *         weight:
 *           type: number
 *         labelDirection:
 *           type: number
 *         barcodeTypeId:
 *           type: number
 */

/**
 * @swagger
 * /boxes:
 *   get:
 *     summary: Retrieve a list of boxes
 *     tags: [Boxes]
 *     responses:
 *       200:
 *         description: A list of boxes.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/BoxDto'
 */
router.get("/boxes", async (req: Request, res: Response) => {
  try {
    const boxes = await prisma.box.findMany();
    res.json(boxes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An error occurred while retrieving boxes" });
  }
});

/**
 * @swagger
 * /boxes:
 *   post:
 *     summary: Create a new box
 *     tags: [Boxes]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateBoxDto'
 *     responses:
 *       201:
 *         description: The created box
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BoxDto'
 */
router.post("/boxes", async (req: Request, res: Response) => {
  try {
    const {
      name,
      width,
      height,
      length,
      boxGroupId,
      weight,
      labelDirection,
      barcodeTypeId,
    } = req.body;
    const validBoxGroup = await prisma.boxGroup.findUnique({
      where: { id: boxGroupId },
    });

    if (!validBoxGroup) {
      return res.status(400).json({ error: "Invalid boxGroupId" });
    }

    if (barcodeTypeId) {
      const validBarcodeType = await prisma.barcodeType.findUnique({
        where: { id: barcodeTypeId },
      });

      if (!validBarcodeType) {
        return res.status(400).json({ error: "Invalid barcodeTypeId" });
      }
    }

    const box = await prisma.box.create({
      data: {
        name,
        width,
        height,
        length,
        boxGroupId,
        weight,
        labelDirection,
        barcodeTypeId,
      },
    });

    res.status(201).json(box);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An error occurred while creating a box" });
  }
});

/**
 * @swagger
 * /boxes/{id}:
 *   get:
 *     summary: Get a box by ID
 *     tags: [Boxes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the box
 *     responses:
 *       200:
 *         description: The requested box
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BoxDto'
 */
router.get("/boxes/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const box = await prisma.box.findUnique({
      where: { id },
    });

    if (box) {
      res.json(box);
    } else {
      res.status(404).json({ error: "Box not found" });
    }
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "An error occurred while retrieving the box" });
  }
});

/**
 * @swagger
 * /boxes/{id}:
 *   patch:
 *     summary: Update a box by ID
 *     tags: [Boxes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the box
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateBoxDto'
 *     responses:
 *       200:
 *         description: The updated box
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BoxDto'
 */
router.patch("/boxes/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, width, height, length, boxGroupId } = req.body;
    const box = await prisma.box.update({
      where: { id },
      data: { name, width, height, length, boxGroupId },
    });
    res.json(box);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An error occurred while updating the box" });
  }
});

/**
 * @swagger
 * /boxes/{id}:
 *   delete:
 *     summary: Delete a box by ID
 *     tags: [Boxes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the box
 *     responses:
 *       204:
 *         description: Box deleted successfully
 */
router.delete("/boxes/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.box.delete({
      where: { id },
    });
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An error occurred while deleting the box" });
  }
});

module.exports = router;
