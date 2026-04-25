require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const session = require("express-session");

const authRoutes = require("./routes/auth");
const chatRoutes = require("./routes/deepsike");
const passport = require("./config/passport");

const app = express();

app.use(session({
    secret: process.env.SESSION_SECRET || "secret",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

app.use(express.json());
app.use(cookieParser());
app.use(express.static("public"));

app.use("/api/chat", chatRoutes);
app.use("/api/auth", authRoutes);

app.get("/login", (req, res) => {    
    res.redirect("/register.html");
});

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("MongoDB подключена"))
    .catch(err => console.error("MongoDB ошибка:", err));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server started on http://localhost:${PORT}`));