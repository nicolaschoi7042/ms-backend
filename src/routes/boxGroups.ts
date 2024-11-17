import express, { Request, Response, Router } from "express";
import { param } from "express-validator";
import { prisma } from "../utils/prisma";

const router: Router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     BoxGroupDto:
 *       type: object
 *       required:
 *        - id
 *        - name
 *        - boxes
 *       properties:
 *         id:
 *           type: integer
 *         name:
 *           type: string
 *         boxes:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/BoxDto'
 *
 *     CreateBoxGroupDto:
 *       type: object
 *       required:
 *         - boxes
 *         - name
 *       properties:
 *         name:
 *           type: string
 *         boxes:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/CreateBoxDto'
 *
 */

/**
 * @swagger
 * /box-groups:
 *   get:
 *     summary: Retrieve a list of box groups
 *     tags: [Box Groups]
 *     responses:
 *       200:
 *         description: A list of box groups.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/BoxGroupDto'
 */
router.get("/box-groups", async (req: Request, res: Response) => {
  try {
    const boxGroups = await prisma.boxGroup.findMany({
      include: {
        boxes: true,
      },
    });
    res.json(boxGroups);
  } catch (error) {
    console.error("Error retrieving box groups:", error);
    res.status(500).json({ error: "Failed to retrieve box groups" });
  }
});

/**
 * @swagger
 * /box-groups/{id}:
 *   get:
 *     summary: Retrieve a single box group by ID
 *     tags: [Box Groups]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the box group to retrieve
 *     responses:
 *       200:
 *         description: A single box group
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BoxGroupDto'
 */
router.get("/box-groups/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const boxGroup = await prisma.boxGroup.findUnique({
      where: { id: Number(id) },
      include: { boxes: true },
    });
    if (boxGroup) {
      res.json(boxGroup);
    } else {
      res.status(404).json({ error: "Box group not found" });
    }
  } catch (error) {
    console.error("Error retrieving box group:", error);
    res.status(500).json({ error: "Failed to retrieve box group" });
  }
});

/**
 * @swagger
 * /box-groups:
 *   post:
 *     summary: Create a new box group
 *     tags: [Box Groups]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateBoxGroupDto'
 *     responses:
 *       201:
 *         description: The created box group
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BoxGroupDto'
 */
router.post("/box-groups", async (req: Request, res: Response) => {
  const { boxes, name } = req.body;

  try {
    const boxGroup = await prisma.boxGroup.create({
      data: {
        name,
        boxes: {
          create: boxes,
        },
      },
      include: {
        boxes: true,
      },
    });
    res.status(201).json(boxGroup);
  } catch (error) {
    console.error("Error creating box group:", error);
    res.status(500).json({ error: "Failed to create box group" });
  }
});

/**
 * @swagger
 * /box-groups/{id}:
 *   delete:
 *     summary: Delete a box group by ID
 *     tags: [Box Groups]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the box group
 *     responses:
 *       204:
 *         description: Box group deleted successfully
 */
router.delete(
  "/box-groups/:id",
  [param("id").isString().withMessage("ID must be an String")],
  async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
      await prisma.boxGroup.delete({
        where: { id: Number(id) },
      });
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting box group:", error);
      res.status(500).json({ error: "Failed to delete box group" });
    }
  }
);

module.exports = router;
