require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const authRoutes = require("./routes/auth");
const chatRoutes = require("./routes/deepsike");
const saveRoutes = require("./routes/root_panel");

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(express.static("public"));
app.use("/api/chat", chatRoutes);
app.use("/api/save", saveRoutes);
app.use("/api/auth", authRoutes);

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("MongoDB подключена"))
    .catch(err => console.error("MongoDB ошибка:", err));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server started on http://localhost:${PORT}`));
