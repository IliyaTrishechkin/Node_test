const request = require("supertest");
const app = require("../app");
const User = require("../models/User");
const Question = require("../models/Question");
const Article = require("../models/Article");
const Advice = require("../models/Advice");
const bcrypt = require("bcrypt");

describe("Root panel (admin CRUD)", () => {

  let agent;

  beforeEach(async () => {
    agent = request.agent(app);

    await User.deleteMany({});
    await Question.deleteMany({});
    await Article.deleteMany({});
    await Advice.deleteMany({});

    // создаём admin
    await User.create({
      name: "Admin",
      email: "admin@test.com",
      password: await bcrypt.hash("123456", 10),
      role: "admin"
    });

    // login admin
    await agent
      .post("/api/auth/login")
      .send({
        email: "admin@test.com",
        password: "123456"
      });
  });

  // ===================== QUESTION =====================
  test("create + get + update + delete question", async () => {

    // CREATE
    const create = await agent
      .post("/api/save/addQuestion")
      .send({
        question: "Test question?",
        answers: ["A", "B"]
      });

    expect(create.statusCode).toBe(200);

    const questions = await agent.get("/api/save/questions");
    expect(questions.body.length).toBe(1);

    const id = questions.body[0]._id;

    // UPDATE
    const update = await agent
      .put(`/api/save/question/${id}`)
      .send({ question: "Updated question" });

    expect(update.statusCode).toBe(200);

    // DELETE
    const del = await agent
      .delete(`/api/save/question/${id}`);

    expect(del.statusCode).toBe(200);

    const after = await agent.get("/api/save/questions");
    expect(after.body.length).toBe(0);
  });

  // ===================== ARTICLE =====================
  test("create + update + delete article", async () => {

    const create = await agent
      .post("/api/save/addArticle")
      .send({
        title: "Title",
        text: "Text"
      });

    expect(create.statusCode).toBe(200);

    const articles = await agent.get("/api/save/articles");
    const id = articles.body[0]._id;

    const update = await agent
      .put(`/api/save/article/${id}`)
      .send({ title: "New Title" });

    expect(update.statusCode).toBe(200);

    const del = await agent
      .delete(`/api/save/article/${id}`);

    expect(del.statusCode).toBe(200);
  });

  // ===================== ADVICE =====================
  test("create + update + delete advice", async () => {

    const create = await agent
      .post("/api/save/addAdvice")
      .send({
        title: "Advice",
        text: "Be careful"
      });

    expect(create.statusCode).toBe(200);

    const advices = await agent.get("/api/save/advices");
    const id = advices.body[0]._id;

    const update = await agent
      .put(`/api/save/advice/${id}`)
      .send({ text: "Updated advice" });

    expect(update.statusCode).toBe(200);

    const del = await agent
      .delete(`/api/save/advice/${id}`);

    expect(del.statusCode).toBe(200);
  });

});