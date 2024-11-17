import express, { Request, Response, Router } from "express";
import { body, validationResult } from "express-validator";
import { prisma } from "../utils/prisma";
import { ICreatePalletGroupDto } from "../components/pallet-group.dto";
import wsClient from "../websocket/websocketClient";
const router: Router = express.Router();

// Constants
const VALID_LOCATIONS = ["좌측", "우측", "보조(좌)", "보조(우)"];
const PALLET_GROUP_MAX_PALLETS = 4;

/**
 * @swagger
 * tags:
 *   name: Pallet Groups
 *   description: API endpoints for Pallet Groups
 */

/**
 * @swagger
 * /pallet-groups:
 *   get:
 *     summary: Retrieve a list of pallet groups
 *     tags: [Pallet Groups]
 *     responses:
 *       200:
 *         description: A list of pallet groups.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/PalletGroupDto'
 */
router.get("/pallet-groups", async (req: Request, res: Response) => {
  try {
    const palletGroups = await prisma.palletGroup.findMany({
      include: {
        pallets: {
          include: {
            palletSpecification: true,
          },
        },
      },
    });
    res.json(palletGroups);
  } catch (error) {
    console.error(
      "🚀 ~ file: pallet-groups.js:86 ~ router.get ~ error:",
      error
    );
    res.status(500).json({ error: "Failed to retrieve pallet groups" });
  }
});

/**
 * @swagger
 * /pallet-groups/{id}:
 *   get:
 *     summary: Retrieve a pallet group by ID
 *     tags: [Pallet Groups]
 *     operationId: getPalletGroupById
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the pallet group to retrieve
 *     responses:
 *       200:
 *         description: A pallet group returned successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PalletGroupDto'
 *       404:
 *         description: Pallet group not found.
 *       500:
 *         description: Failed to retrieve the pallet group due to an internal server error.
 */
router.get("/pallet-groups/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const palletGroup = await prisma.palletGroup.findUnique({
      where: { id: Number(id) },
      include: {
        pallets: {
          include: {
            palletSpecification: true,
          },
        },
      },
    });
    if (!palletGroup) {
      return res.status(404).json({ error: "Pallet group not found" });
    }
    res.json(palletGroup);
  } catch (error) {
    console.error(
      "🚀 ~ file: pallet-groups.js:112 ~ router.get ~ error:",
      error
    );
    res.status(500).json({ error: "Failed to retrieve pallet group" });
  }
});

// Create a new pallet group
/**
 * @swagger
 * /pallet-groups:
 *   post:
 *     summary: Create a new pallet group
 *     tags: [Pallet Groups]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreatePalletGroupDto'
 *     responses:
 *       201:
 *         description: The created pallet group
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PalletGroupDto'
 */
router.post(
  "/pallet-groups",
  [
    // Validation rules
    body("name").isString(),
    body("pallets").isArray(),
    body("pallets").isArray(),
    body("pallets.*.palletSpecificationId").optional().isString(),
    body("pallets.*.isBuffer").optional().isBoolean(),
    body("pallets.*.isUse").optional().isBoolean(),
    body("pallets.*.isError").optional().isBoolean(),
    body("pallets.*.location").isString(),
    body("pallets.*.isInvoiceVisible").optional().isBoolean(),
    body("pallets.*.loadingHeight").optional().isNumeric(),
    body("pallets.*.orderInformation").optional().isString(),
    body("pallets.*.boxGroupId").optional().isNumeric(),
    body("pallets.*.loadingPatternId").optional().isNumeric(),
  ],
  async (req: Request<any, any, ICreatePalletGroupDto>, res: Response) => {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, location, pallets } = req.body;

    // Validate palletIds count
    if (pallets.length > PALLET_GROUP_MAX_PALLETS) {
      return res
        .status(400)
        .json({ error: "Exceeded maximum pallet count for a group" });
    }

    // Validate pallets' location values
    const locations = pallets.map((pallet) => pallet.location);
    const invalidLocations = locations.filter(
      (location) => !VALID_LOCATIONS.includes(location)
    );

    if (invalidLocations.length > 0) {
      return res
        .status(400)
        .json({ error: "Invalid pallet locations", invalidLocations });
    }

    // Validate pallets' palletSpecificationId
    const palletSpecificationIds = [
      ...new Set(
        pallets.map((pallet) => pallet.palletSpecificationId).filter(Boolean)
      ),
    ] as string[];

    try {
      const validPalletSpecificationIds =
        await prisma.palletSpecification.findMany({
          where: {
            id: { in: palletSpecificationIds },
          },
          select: {
            id: true,
          },
        });

      if (
        validPalletSpecificationIds.length !== palletSpecificationIds.length
      ) {
        return res
          .status(400)
          .json({ error: "Invalid pallet specification IDs" });
      }

      const boxGroupIds = [
        ...new Set(pallets.map((pallet) => pallet.boxGroupId).filter(Boolean)),
      ] as number[];

      const validBoxGroupIds = await prisma.boxGroup.findMany({
        where: {
          id: { in: boxGroupIds },
        },
        select: {
          id: true,
        },
      });

      if (validBoxGroupIds.length !== boxGroupIds.length) {
        return res.status(400).json({ error: "Invalid box group IDs" });
      }

      const loadingPatternIds = [
        ...new Set(
          pallets.map((pallet) => pallet.loadingPatternId).filter(Boolean)
        ),
      ] as number[];
      const validLoadingPatternIds = await prisma.loadingPattern.findMany({
        where: {
          id: { in: loadingPatternIds },
        },
        select: {
          id: true,
        },
      });

      if (validLoadingPatternIds.length !== loadingPatternIds.length) {
        return res.status(400).json({ error: "Invalid loading pattern IDs" });
      }

      const createdPalletGroup = await prisma.palletGroup.create({
        data: {
          name,
          location,
          pallets: {
            create: pallets,
          },
        },
        include: {
          pallets: true,
        },
      });
      await wsClient.jobInfoListCall();
      res.status(201).json(createdPalletGroup);
    } catch (error) {
      console.error(
        "🚀 ~ file: pallet-groups.js:291 ~ router.post ~ error:",
        error
      );
      res.status(500).json({ error: "Failed to create pallet group" });
    }
  }
);

// Delete a pallet group
/**
 * @swagger
 * /pallet-groups/{id}:
 *   delete:
 *     summary: Delete a pallet group by ID
 *     tags: [Pallet Groups]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the pallet group
 *     responses:
 *       204:
 *         description: Pallet group deleted successfully
 *       500:
 *         description: Failed to delete pallet group
 */
router.delete("/pallet-groups/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const palletGroup = await prisma.palletGroup.findUnique({
      where: { id: Number(id) },
    });
    if (!palletGroup) {
      return res.status(404).json({ error: "Pallet group not found" });
    }

    await prisma.palletGroup.update({
      where: { id: Number(id) },
      data: {
        pallets: {
          deleteMany: {},
        },
      },
    });
    await prisma.palletGroup.delete({
      where: { id: Number(id) },
    });
    await wsClient.jobInfoListCall();
    res.sendStatus(204);
  } catch (error) {
    console.error(
      "🚀 ~ file: pallet-groups.js:340 ~ router.delete ~ error:",
      error
    );
    res.status(500).json({ error: "Failed to delete pallet group" });
  }
});

module.exports = router;
