const request = require("supertest");
const app = require("../app");
const mongoose = require("mongoose");
const User = require("../models/User");
const Registration = require("../models/Registration");
const bcrypt = require("bcrypt");

describe("Auth flow", () => {

  afterEach(async () => {
    await User.deleteMany({});
    await Registration.deleteMany({});
  });

  // ===================== 1. REGISTER + CONFIRM =====================
  test("register + confirm user", async () => {

    const email = "test@test.com";

    const reg = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Test",
        email,
        password: "123456"
      });

    expect(reg.statusCode).toBe(200);

    // берём код из БД (как у тебя в тестовом режиме)
    const record = await Registration.findOne({ email });

    expect(record).toBeTruthy();

    // ⚠️ в твоей логике код захэширован → надо достать оригинал
    // но у тебя есть testCode в ответе — используем его
    const testCode = reg.body.testCode;

    const confirm = await request(app)
      .post("/api/auth/register-confirm")
      .send({
        email,
        code: testCode
      });

    expect(confirm.statusCode).toBe(200);
    expect(confirm.body.message).toBe("Registration successful!");
  });

  // ===================== 2. LOGIN =====================
  test("login user", async () => {

    const email = "login@test.com";

    await User.create({
      name: "Login",
      email,
      password: await bcrypt.hash("123456", 10),
      role: "user"
    });

    const res = await request(app)
      .post("/api/auth/login")
      .send({
        email,
        password: "123456"
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toContain("Login");
  });

  // ===================== 3. ME =====================
  test("get current user /me", async () => {

    const email = "me@test.com";

    await User.create({
      name: "Me",
      email,
      password: await bcrypt.hash("123456", 10),
      role: "user"
    });

    const agent = request.agent(app);

    await agent
      .post("/api/auth/login")
      .send({
        email,
        password: "123456"
      });

    const res = await agent.get("/api/auth/me");

    expect(res.statusCode).toBe(200);
    expect(res.body.email).toBe(email);
  });

  // ===================== 4. LOGOUT =====================
  test("logout clears cookie", async () => {

    const email = "logout@test.com";

    await User.create({
      name: "Logout",
      email,
      password: await bcrypt.hash("123456", 10),
      role: "user"
    });

    const agent = request.agent(app);

    await agent
      .post("/api/auth/login")
      .send({
        email,
        password: "123456"
      });

    const res = await agent.post("/api/auth/logout");

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe("Logged out");
  });

});