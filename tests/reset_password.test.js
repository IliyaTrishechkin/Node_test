const request = require("supertest");
const app = require("../app");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const User = require("../models/User");
const ResetPassword = require("../models/ResetPassword");

describe("Reset password flow", () => {

  let agent;

  beforeAll(async () => {
    agent = request.agent(app);
  });

  afterEach(async () => {
    await User.deleteMany({});
    await ResetPassword.deleteMany({});
  });

  // ================= FORGOT PASSWORD =================
  test("forgot password creates reset code (existing user)", async () => {

    const email = "reset@test.com";

    await User.create({
      name: "ResetUser",
      email,
      password: await bcrypt.hash("123456", 10)
    });

    const res = await agent
      .post("/api/forgot/forgot-password")
      .send({ email });

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toContain("If this email exists");

    const token = await ResetPassword.findOne({ email });

    expect(token).not.toBeNull();
  });

  test("forgot password works even if user does not exist", async () => {

    const res = await agent
      .post("/api/forgot/forgot-password")
      .send({ email: "ghost@test.com" });

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toContain("If this email exists");
  });

  // ================= RESET PASSWORD =================
  test("reset password success flow", async () => {

    const email = "reset2@test.com";

    const oldPassword = "123456";
    const newPassword = "newpass123";

    await User.create({
      name: "ResetUser2",
      email,
      password: await bcrypt.hash(oldPassword, 10)
    });

    // simulate forgot-password
    await agent
      .post("/api/forgot/forgot-password")
      .send({ email });

    const resetRecord = await ResetPassword.findOne({ email });

    expect(resetRecord).not.toBeNull();

    // IMPORTANT: берём реальный код через bcrypt compare нельзя — поэтому временно используем hack
    // (в тесте мы НЕ можем получить plain code, значит пересоздадим код через внутреннюю логику)
    // проще: подменим запись вручную

    const plainCode = "123456";
    resetRecord.code = await bcrypt.hash(plainCode, 10);
    await resetRecord.save();

    const res = await agent
      .post("/api/forgot/reset-password")
      .send({
        email,
        code: plainCode,
        newPassword
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe("Password updated successfully");

    const updatedUser = await User.findOne({ email });

    const isMatch = await bcrypt.compare(newPassword, updatedUser.password);
    expect(isMatch).toBe(true);
  });

  test("reset password fails with wrong code", async () => {

    const email = "reset3@test.com";

    await User.create({
      name: "ResetUser3",
      email,
      password: await bcrypt.hash("123456", 10)
    });

    await ResetPassword.create({
      email,
      code: await bcrypt.hash("111111", 10)
    });

    const res = await agent
      .post("/api/forgot/reset-password")
      .send({
        email,
        code: "000000",
        newPassword: "newpass"
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe("Invalid or expired code");
  });

});
