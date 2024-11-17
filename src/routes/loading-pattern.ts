import express, { Request, Response, Router } from "express";
import { prisma } from "../utils/prisma";
import { body, param, validationResult } from "express-validator";

const router: Router = express.Router();

/**
 * @swagger
 * /loading-patterns:
 *   get:
 *     summary: Retrieve a list of loading patterns
 *     tags: [LoadingPatterns]
 *     responses:
 *       200:
 *         description: A list of loading patterns.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/LoadingPatternDto'
 */
router.get("/loading-patterns", async (req: Request, res: Response) => {
  try {
    const loadingPatterns = await prisma.loadingPattern.findMany({
      where: {
        isSelectable: true,
      },
    });
    res.json(loadingPatterns);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "An error occurred while retrieving loading patterns" });
  }
});

/**
 * @swagger
 * /loading-patterns/{id}:
 *   get:
 *     summary: Retrieve a loading pattern by ID
 *     tags: [LoadingPatterns]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the loading pattern
 *     responses:
 *       200:
 *         description: The requested loading pattern
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoadingPatternDto'
 *       404:
 *         description: Loading pattern not found
 */
router.get(
  "/loading-patterns/:id",
  [
    param("id")
      .isInt()
      .withMessage("loadingPatternId must be an integer")
      .toInt(),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { id } = req.params;
    try {
      const loadingPattern = await prisma.loadingPattern.findUnique({
        where: { id: Number(id) },
      });
      if (!loadingPattern) {
        return res.status(404).json({ error: "Loading pattern not found" });
      }
      res.json(loadingPattern);
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ error: "An error occurred while retrieving loading pattern" });
    }
  }
);

/**
 * @swagger
 * /loading-patterns:
 *   post:
 *     summary: Create a new loading pattern
 *     tags: [LoadingPatterns]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateLoadingPatternDto'
 *     responses:
 *       201:
 *         description: The created loading pattern
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoadingPatternDto'
 *       400:
 *         description: Bad request
 */
router.post(
  "/loading-patterns",
  [
    body("name").isString().withMessage("name must be a string"),
    body("isSelectable")
      .isBoolean()
      .withMessage("isSelectable must be a boolean"),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { name, isSelectable } = req.body;
    try {
      const loadingPattern = await prisma.loadingPattern.create({
        data: {
          name,
          isSelectable,
        },
      });
      res.status(201).json(loadingPattern);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to create loading pattern" });
    }
  }
);

/**
 * @swagger
 * /loading-patterns/{id}:
 *   patch:
 *     summary: Update a loading pattern by ID
 *     tags: [LoadingPatterns]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the loading pattern
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateLoadingPatternDto'
 *     responses:
 *       200:
 *         description: The updated loading pattern
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoadingPatternDto'
 *       400:
 *         description: Bad request
 *       404:
 *         description: Loading pattern not found
 */
router.patch(
  "/loading-patterns/:id",
  [
    param("id")
      .isInt()
      .withMessage("loadingPatternId must be an integer")
      .toInt(),
    body("name").isString().withMessage("name must be a string"),
    body("isSelectable")
      .isBoolean()
      .withMessage("isSelectable must be a boolean"),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { id } = req.params;
    const { name, isSelectable } = req.body;
    try {
      const existingLoadingPattern = await prisma.loadingPattern.findUnique({
        where: { id: Number(id) },
      });
      if (!existingLoadingPattern) {
        return res.status(404).json({ error: "Loading pattern not found" });
      }
      const loadingPattern = await prisma.loadingPattern.update({
        where: { id: Number(id) },
        data: {
          name,
          isSelectable,
        },
      });
      if (!loadingPattern) {
        return res.status(404).json({ error: "Loading pattern not found" });
      }
      res.json(loadingPattern);
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ error: "An error occurred while updating loading pattern" });
    }
  }
);

/**
 * @swagger
 * /loading-patterns/{id}:
 *   delete:
 *     summary: Delete a loading pattern by ID
 *     tags: [LoadingPatterns]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the loading pattern
 *     responses:
 *       204:
 *         description: Loading pattern deleted
 *       404:
 *         description: Loading pattern not found
 */
router.delete(
  "/loading-patterns/:id",
  [
    param("id")
      .isInt()
      .withMessage("loadingPatternId must be an integer")
      .toInt(),
  ],
  async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
      const existingLoadingPattern = await prisma.loadingPattern.findUnique({
        where: { id: Number(id) },
      });
      if (!existingLoadingPattern) {
        return res.status(404).json({ error: "Loading pattern not found" });
      }
      await prisma.loadingPattern.delete({
        where: { id: Number(id) },
      });
      res.sendStatus(204);
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ error: "An error occurred while deleting loading pattern" });
    }
  }
);

/**
 * @swagger
 * /loading-patterns/preview:
 *   post:
 *     summary: Preview a loading pattern
 *     tags: [LoadingPatterns]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateLoadingPatternPreviewDto'
 *     responses:
 *       200:
 *         description: The loading pattern preview
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CreateLoadingPatternPreviewResponseDto'
 *       400:
 *         description: Bad request
 */
router.post(
  "/loading-patterns/preview",
  [
    body("palletSpecificationId")
      .isString()
      .withMessage("palletSpecificationId must be a string"),
    body("boxGroupId").isInt().withMessage("boxGroupId must be an integer"),
    body("loadingHeight")
      .isInt()
      .withMessage("loadingHeight must be an integer"),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { palletSpecificationId, boxGroupId } = req.body;
    try {
      const existingPalletSpecification =
        await prisma.palletSpecification.findUnique({
          where: { id: palletSpecificationId },
        });
      if (!existingPalletSpecification) {
        return res
          .status(404)
          .json({ error: "Pallet specification not found" });
      }
      const existingBoxGroup = await prisma.boxGroup.findUnique({
        where: { id: boxGroupId },
      });
      if (!existingBoxGroup) {
        return res.status(404).json({ error: "Box group not found" });
      }

      const loadingPatternPreview = [
        {
          name: "C 혼합",
          loadingBoxCount: 0,
          loadingRate: 0,
          isSelectable: false,
        },
        {
          name: "180도 회전",
          loadingBoxCount: 25,
          loadingRate: 93.2,
          isSelectable: true,
          boxPositions: [
            {
              x: 0,
              y: 0,
              z: 0,
              width: 1200,
              height: 500,
              length: 800,
              boxName: "A",
              isLoading: true,
              loadingOrder: 1,
              boxBarcode: "A123456",
            },
          ],
        },
        {
          name: "90도 회전",
          loadingBoxCount: 25,
          loadingRate: 93.2,
          isSelectable: true,
        },
        {
          name: "블록(수직)",
          loadingBoxCount: 24,
          loadingRate: 85.7,
          isSelectable: true,
        },
        {
          name: "핀휠(풍차)",
          loadingBoxCount: 22,
          loadingRate: 80.2,
          isSelectable: true,
        },
      ];
      res.json(loadingPatternPreview);
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ error: "An error occurred while previewing loading pattern" });
    }
  }
);

module.exports = router;
