require("dotenv").config({ path: ".env.test" });

const mongoose = require("mongoose");
const User = require("../models/User");
const bcrypt = require("bcrypt");

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI);

  // чистим БД перед стартом
  await mongoose.connection.db.dropDatabase();

  // создаём admin пользователя для тестов
  const hashedPassword = await bcrypt.hash("123456", 10);

  await User.create({
    name: "admin",
    email: "admin@test.com",
    password: hashedPassword,
    role: "admin"
  });
});

afterEach(async () => {
  const collections = mongoose.connection.collections;

  for (const key in collections) {
    await collections[key].deleteMany({});
  }

  // возвращаем admin после каждого теста (он нужен всегда)
  const exists = await User.findOne({ email: "admin@test.com" });

  if (!exists) {
    const hashedPassword = await bcrypt.hash("123456", 10);

    await User.create({
      name: "admin",
      email: "admin@test.com",
      password: hashedPassword,
      role: "admin"
    });
  }
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});