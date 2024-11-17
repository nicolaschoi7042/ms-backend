import express, { Request, Response, Router } from "express";
import { body, param, query, validationResult } from "express-validator";
import { difference } from "lodash";
import { prisma } from "../utils/prisma";

const router: Router = express.Router();

/**
 * @swagger
 * tags:
 *   - name: Pallet Specifications
 *     description: API endpoints for managing Pallet Specifications
 *
 * components:
 *   schemas:
 *     PalletSpecificationDto:
 *       type: object
 *       required:
 *         - id
 *         - name
 *         - width
 *         - length
 *         - height
 *         - overhang
 *       properties:
 *         id:
 *           type: string
 *         name:
 *           type: string
 *         width:
 *           type: number
 *         length:
 *           type: number
 *         height:
 *           type: number
 *         overhang:
 *           type: number
 *       example:
 *         id: "00990e3d-6f29-44cb-acea-f41d111708e1"
 *         name: "Example Pallet"
 *         width: 100.5
 *         length: 50.2
 *         height: 30.7
 *         overhang: 5.0
 *     CreatePalletSpecificationDto:
 *       type: object
 *       required:
 *         - name
 *         - width
 *         - length
 *         - height
 *         - overhang
 *       properties:
 *         name:
 *           type: string
 *         width:
 *           type: number
 *         length:
 *           type: number
 *         height:
 *           type: number
 *         overhang:
 *           type: number
 *       example:
 *         name: "New Pallet"
 *         width: 80.0
 *         length: 40.0
 *         height: 20.0
 *         overhang: 5.0
 *     UpdatePalletSpecificationDto:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *         width:
 *           type: number
 *         length:
 *           type: number
 *         height:
 *           type: number
 *         overhang:
 *           type: number
 *       example:
 *         name: "Updated Pallet"
 *         width: 90.0
 *         length: 45.0
 *         height: 25.0
 *         overhang: 5.5
 *     BulkUpdatePalletSpecificationDto:
 *       type: object
 *       properties:
 *         robotSerial:
 *           type: string
 *         createPalletSpecifications:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/CreatePalletSpecificationDto'
 *         updatePalletSpecifications:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/PalletSpecificationDto'
 *         deletePalletSpecificationIds:
 *           type: array
 *           items:
 *             type: string
 *
 * /pallet-specifications:
 *   get:
 *     summary: Retrieve a list of pallet specifications
 *     tags: [Pallet Specifications]
 *     parameters:
 *       - in: query
 *         name: robotSerial
 *         required: true
 *         schema:
 *           type: string
 *         description: The serial number of the robot to retrieve pallet specifications for
 *     responses:
 *       200:
 *         description: A list of pallet specifications.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/PalletSpecificationDto'
 */

router.get(
  "/pallet-specifications",
  [
    query("robotSerial")
      .isString()
      .withMessage("Robot serial must be a string"),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
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

      const palletSpecifications = await prisma.palletSpecification.findMany({
        where: {
          robotId: robot.id,
        },
      });
      res.json(palletSpecifications);
    } catch (error) {
      res
        .status(500)
        .json({ error: "Failed to retrieve pallet specifications" });
    }
  }
);

// Get a pallet specification by ID
/**
 * @swagger
 * /pallet-specifications/{id}:
 *   get:
 *     summary: Get a pallet specification by ID
 *     tags: [Pallet Specifications]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the pallet specification
 *     responses:
 *       200:
 *         description: The requested pallet specification
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PalletSpecificationDto'
 *       404:
 *         description: Pallet specification not found
 */
router.get(
  "/pallet-specifications/:id",
  [param("id").isString().withMessage("ID must be an String")],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    try {
      const palletSpecification = await prisma.palletSpecification.findUnique({
        where: { id },
      });
      if (palletSpecification) {
        res.json(palletSpecification);
      } else {
        res.status(404).json({ error: "Pallet specification not found" });
      }
    } catch (error) {
      res
        .status(500)
        .json({ error: "Failed to retrieve pallet specification" });
    }
  }
);

/**
 * @swagger
 * /pallet-specifications/bulk:
 *   post:
 *     summary: Perform bulk create, update, and delete operations on PalletSpecifications
 *     tags: [Pallet Specifications]
 *     security:
 *       - Authorization: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BulkUpdatePalletSpecificationDto'
 *     responses:
 *       200:
 *         description: Bulk operations successful
 *       500:
 *         description: An error occurred during bulk operations
 */
router.post(
  "/pallet-specifications/bulk",
  [
    body("robotSerial").isString().withMessage("robotSerial must be a string"),
    body("createPalletSpecifications")
      .optional()
      .isArray()
      .custom((value) => {
        if (value) {
          for (let item of value) {
            if (typeof item.name !== "string")
              throw new Error("name must be a string");
            if (typeof item.width !== "number")
              throw new Error("width must be a number");
            if (typeof item.height !== "number")
              throw new Error("height must be a number");
            if (typeof item.length !== "number")
              throw new Error("length must be a number");
          }
        }
        return true;
      }),
    body("updatePalletSpecifications")
      .optional()
      .isArray()
      .custom((value) => {
        if (value) {
          for (let item of value) {
            if (item.id !== undefined && typeof item.id !== "string")
              throw new Error("id must be a string");
            if (item.name !== undefined && typeof item.name !== "string")
              throw new Error("name must be a string");
            if (item.width !== undefined && typeof item.width !== "number")
              throw new Error("width must be a number");
            if (item.height !== undefined && typeof item.height !== "number")
              throw new Error("height must be a number");
            if (item.length !== undefined && typeof item.length !== "number")
              throw new Error("length must be a number");
          }
        }
        return true;
      }),
    body("deletePalletSpecificationIds")
      .optional()
      .isArray()
      .custom((value) => {
        if (value) {
          for (let item of value) {
            if (typeof item !== "string")
              throw new Error(
                "deletePalletSpecificationIds must be an array of strings"
              );
          }
        }
        return true;
      }),
  ],
  async (req: Request, res: Response) => {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      createPalletSpecifications,
      updatePalletSpecifications,
      deletePalletSpecificationIds,
      robotSerial,
    } = req.body;

    try {
      // Check if robot exists
      const robot = await prisma.robot.findUnique({
        where: { serial: robotSerial },
      });
      if (!robot) {
        return res.status(404).json({ error: "Robot not found" });
      }
      // check deletePalletSpecificationIds
      if (deletePalletSpecificationIds) {
        const palletSpecifications = await prisma.palletSpecification.findMany({
          where: {
            id: {
              in: deletePalletSpecificationIds,
            },
          },
        });
        const palletSpecificationIds = palletSpecifications.map(
          (palletSpec) => palletSpec.id
        );
        const diffIds = difference(
          deletePalletSpecificationIds,
          palletSpecificationIds
        );
        if (diffIds.length !== 0) {
          return res
            .status(404)
            .json({ error: `${diffIds.join(", ")} id not found` });
        }
      }

      await prisma.$transaction([
        ...(createPalletSpecifications
          ? createPalletSpecifications.map((palletSpec: any) =>
              prisma.palletSpecification.create({
                data: { ...palletSpec, robotId: robot.id },
              })
            )
          : []),
        ...(updatePalletSpecifications
          ? updatePalletSpecifications.map((palletSpec: any) =>
              prisma.palletSpecification.update({
                where: { id: palletSpec.id },
                data: palletSpec,
              })
            )
          : []),
        ...(deletePalletSpecificationIds
          ? deletePalletSpecificationIds.map((id: string) =>
              prisma.palletSpecification.delete({ where: { id } })
            )
          : []),
      ]);

      res.status(200).json({ message: "Bulk operations successful" });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ error: "An error occurred during bulk operations" });
    }
  }
);

module.exports = router;
