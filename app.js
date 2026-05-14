const express = require("express");
const session = require("express-session");
const cookieParser = require("cookie-parser");

const logger = require("./logger");

const authRoutes = require("./routes/auth");
const chatRoutes = require("./routes/deepsike");
const passport = require("./config/passport");
const saveRoutes = require("./routes/root_panel");
const forgotRoutes = require("./routes/reset_password");

const app = express();


app.set("trust proxy", true);
// логирование
app.use((req, res, next) => {
    res.on("finish", () => {
        logger.info("Request", {
            method: req.method,
            url: req.url,
            status: res.statusCode,
            ip: req.ip
        });
    });
    next();
});

// middleware
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(passport.initialize());
// app.use(passport.session()); // КОМЕНТУЄМО - використовуємо JWT

app.use(express.static("public"));

// routes
app.use("/api/chat", chatRoutes);
app.use("/api/save", saveRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/forgot", forgotRoutes);

app.get("/login", (req, res) => { 
    res.redirect("/register.html"); 
});

// error handler (всегда в конце)
app.use((err, req, res, next) => {
    logger.error("Unhandled error", {
        url: req.url,
        method: req.method,
        message: err.message,
        stack: err.stack
    });

    res.status(500).json({ message: "Internal server error" });
});

module.exports = app;
