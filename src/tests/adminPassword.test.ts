import request from "supertest";
import { PrismaClient } from "@prisma/client";
import app from "..";
import { hashSync } from "bcryptjs";

const prisma = new PrismaClient();

describe("Admin Password Routes", () => {
  let token = ""; // JWT 토큰을 저장할 변수

  beforeAll(async () => {
    await prisma.adminPassword.create({
      data: {
        robotSerial: "test-serial",
        password: hashSync("1234"),
      },
    });
  });

  afterAll(async () => {
    await prisma.adminPassword.deleteMany();
    await prisma.$disconnect();
  });

  describe("POST /admin-password/check", () => {
    it("로봇 시리얼이 존재하지 않을 경우 400을 반환해야 합니다", async () => {
      const res = await request(app)
        .post("/admin-password/check")
        .send({ robotSerial: "non-existent-serial", password: "password" });
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error", "Robot serial does not exist");
    });

    it("비밀번호가 일치하지 않을 경우 400을 반환해야 합니다", async () => {
      const res = await request(app)
        .post("/admin-password/check")
        .send({ robotSerial: "test-serial", password: "wrong-password" });
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error", "Password does not match");
    });

    it("비밀번호가 일치하면 200을 반환하고 토큰을 설정해야 합니다", async () => {
      const res = await request(app)
        .post("/admin-password/check")
        .send({ robotSerial: "test-serial", password: "1234" });
      expect(res.status).toBe(200);
      token = res.body.token;
    });
  });

  describe("POST /admin-password/change", () => {
    it("JWT가 없으면 401을 반환해야 합니다", async () => {
      const res = await request(app).post("/admin-password/change").send({
        oldPassword: "admin1234",
        newPassword: "new-password",
      });
      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty("error", "No token provided.");
    });

    it("이전 비밀번호가 일치하지 않을 경우 400을 반환해야 합니다", async () => {
      const res = await request(app)
        .post("/admin-password/change")
        .set("Authorization", `Bearer ${token}`)
        .send({
          oldPassword: "wrong-password",
          newPassword: "new-password",
        });
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error", "Old password does not match");
    });

    it("비밀번호가 성공적으로 변경되면 200을 반환해야 합니다", async () => {
      const res = await request(app)
        .post("/admin-password/change")
        .set("Authorization", `Bearer ${token}`)
        .send({
          oldPassword: "1234",
          newPassword: "new-password",
        });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty(
        "message",
        "Password changed successfully"
      );
    });

    it("변경된 비밀번호가 일치하면 200을 반환해야 합니다", async () => {
      const res = await request(app)
        .post("/admin-password/check")
        .send({ robotSerial: "test-serial", password: "new-password" });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("token"); // Change this check to match your API's expected output
    });
  });
});
