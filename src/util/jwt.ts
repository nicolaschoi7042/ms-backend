import { Request, Response } from "express";
import jwt from "jsonwebtoken";
require("dotenv").config();

const JWT_SECRET = process.env.JWT_SECRET;

export const generateToken = (robotSerial: string) => {
  if (!JWT_SECRET) throw new Error("JWT_SECRET not set");
  return jwt.sign(robotSerial, JWT_SECRET);
};

export const verifyToken = (req: Request, res: Response, next: any) => {
  if (!JWT_SECRET) throw new Error("JWT_SECRET not set");

  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: "No token provided." });
  }

  const token = authHeader.split(" ")[1]; // Bearer <token>

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: "Failed to authenticate token." });
    }
    if (typeof decoded !== "string") {
      return res.status(401).json({ error: "Failed to authenticate token." });
    }
    // Add decoded robotSerial to request object for further use
    req.body.robotSerial = decoded;
    next();
  });
};
