import { compare, hashSync } from "bcryptjs";
import express, { Request, Response, Router } from "express";
import { body, validationResult } from "express-validator";
import { generateToken, verifyToken } from "../util/jwt";
import { prisma } from "../utils/prisma";
const router: Router = express.Router();

/**
 * @swagger
 * tags:
 *   name: AdminPassword
 *   description: API endpoints for Admin Passwords
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     PasswordCheckResponseDto:
 *       type: object
 *       required:
 *        - token
 *       properties:
 *         token:
 *           type: string
 *     ChangePasswordDto:
 *       type: object
 *       required:
 *         - oldPassword
 *         - newPassword
 *       properties:
 *         oldPassword:
 *           type: string
 *         newPassword:
 *           type: string
 *       example:
 *         oldPassword: "admin1234"
 *         newPassword: "admin5678"
 *     CheckPasswordDto:
 *       type: object
 *       required:
 *         - robotSerial
 *         - password
 *       properties:
 *         robotSerial:
 *           type: string
 *         password:
 *           type: string
 */

// Check if password matches
/**
 * @swagger
 * /admin-password/check:
 *   post:
 *     summary: Check if the provided password matches
 *     tags: [AdminPassword]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CheckPasswordDto'
 *     responses:
 *       200:
 *         description: Password matches
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PasswordCheckResponseDto'
 *       400:
 *         description: Password does not match or Robot serial does not exist
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       500:
 *         description: Failed to check password
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
router.post(
  "/admin-password/check",
  [
    body("robotSerial")
      .isString()
      .withMessage("Robot serial should be a string"),
    body("password").isString().withMessage("Password should be a string"),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const adminPassword = await prisma.adminPassword.findUnique({
        where: { robotSerial: req.body.robotSerial },
      });
      if (!adminPassword) {
        return res.status(400).json({ error: "Robot serial does not exist" });
      }
      const isMatch = await compare(req.body.password, adminPassword.password);

      if (isMatch) {
        const token = generateToken(req.body.robotSerial);
        res.status(200).json({ token });
      } else {
        res.status(400).json({ error: "Password does not match" });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to check password" });
    }
  }
);

// Change password
/**
 * @swagger
 * /admin-password/change:
 *   post:
 *     summary: Change the password
 *     tags: [AdminPassword]
 *     security:
 *       - Authorization: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ChangePasswordDto'
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       400:
 *         description: Failed to change password
 */
router.post(
  "/admin-password/change",
  [
    verifyToken,
    body("oldPassword")
      .isString()
      .withMessage("Old password should be a string"),
    body("newPassword")
      .isString()
      .withMessage("New password should be a string"),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const adminPassword = await prisma.adminPassword.findUnique({
        where: { robotSerial: req.body.robotSerial },
      });
      if (!adminPassword) {
        return res.status(400).json({ error: "Robot serial does not exist" });
      }
      const isMatch = await compare(
        req.body.oldPassword,
        adminPassword.password
      );
      if (!isMatch) {
        return res.status(400).json({ error: "Old password does not match" });
      }

      await prisma.adminPassword.update({
        where: { id: adminPassword.id },
        data: { password: hashSync(req.body.newPassword) },
      });

      res.json({ message: "Password changed successfully" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to change password" });
    }
  }
);

module.exports = router;
