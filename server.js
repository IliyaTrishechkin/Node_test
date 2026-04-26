require("dotenv").config();
const express = require("express");
const session = require("express-session");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");

const authRoutes = require("./routes/auth");
const chatRoutes = require("./routes/deepsike");
const passport = require("./config/passport");

const app = express();

// middleware
app.use(session({
    secret: "secret_key",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());
app.use(express.json());
app.use(cookieParser());
app.use(express.static("public"));

// routes
app.use("/api/chat", chatRoutes);
app.use("/api/auth", authRoutes);

app.get("/login", (req, res) => { 
    res.redirect("/register.html"); 
});

// connect DB
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("MongoDB connected"))
    .catch(err => console.error("MongoDB error:", err));

// start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
    console.log(`Server started on http://localhost:${PORT}`)
);