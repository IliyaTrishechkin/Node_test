const request = require("supertest");
const app = require("../app");
const mongoose = require("mongoose");

const Question = require("../models/Question");

describe("Deepseek / test module", () => {

  let agent;

  beforeAll(() => {
    agent = request.agent(app);
  });

  afterEach(async () => {
    await Question.deleteMany({});
  });

  // ================= GET /questions =================
  test("GET /questions returns array of questions", async () => {

    await Question.insertMany([
      { question: "Q1", answers: [1, 2, 3] },
      { question: "Q2", answers: [1, 2, 3] },
      { question: "Q3", answers: [1, 2, 3] }
    ]);

    const res = await agent.get("/api/chat/questions");

    expect(res.statusCode).toBe(200);
    expect(res.body.questions).toBeDefined();
    expect(Array.isArray(res.body.questions)).toBe(true);
    expect(res.body.questions.length).toBe(3);
  });

  // ================= POST /test =================

  test("POST /test - simple answers (1,2,3)", async () => {

    const res = await agent.post("/api/chat/test").send({
      answers: [
        { answer: 1 },
        { answer: 2 },
        { answer: 3 }
      ]
    });

    expect(res.statusCode).toBe(200);

    expect(res.body.scores).toBeDefined();
    expect(res.body.percentages).toBeDefined();
    expect(res.body.recommendation).toBeDefined();

    expect(res.body.scores.good).toBe(1);
    expect(res.body.scores.minor).toBe(1);
    expect(res.body.scores.bad).toBe(1);
  });

  test("POST /test - custom answer treated as minor (fallback)", async () => {

    const res = await agent.post("/api/chat/test").send({
      answers: [
        { answer: 4, customText: "я не знаю що сказати" }
      ]
    });

    expect(res.statusCode).toBe(200);

    // ИИ не тестируем → он всегда fallback = 2 (minor)
    expect(res.body.scores.minor).toBe(1);
  });

  test("POST /test - empty custom answer treated as minor", async () => {

    const res = await agent.post("/api/chat/test").send({
      answers: [
        { answer: 4, customText: "" }
      ]
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.scores.minor).toBe(1);
  });

  test("POST /test - invalid format returns 400", async () => {

    const res = await agent.post("/api/chat/test").send({
      answers: "not-array"
    });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("Invalid format: expected answers array");
  });

  test("POST /test - unknown answer defaults to minor", async () => {

    const res = await agent.post("/api/chat/test").send({
      answers: [
        { answer: 999 }
      ]
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.scores.minor).toBe(0);
  });

});
