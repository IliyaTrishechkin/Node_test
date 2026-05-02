require("dotenv").config();
const express = require("express");
const session = require("express-session");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");

const logger = require("./logger");

const app = express();

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


const authRoutes = require("./routes/auth");
const chatRoutes = require("./routes/deepsike");
const passport = require("./config/passport");
const saveRoutes = require("./routes/root_panel");
const forgotRoutes = require("./routes/reset_password");


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
app.use("/api/save", saveRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/forgot", forgotRoutes);

app.get("/login", (req, res) => { 
    res.redirect("/register.html"); 
});

// connect DB
mongoose.connect(process.env.MONGO_URI)
    .then(() => logger.info("MongoDB connected"))
    .catch(err => logger.error("MongoDB error", {
            message: err.message,
            stack: err.stack
        })
);

// start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
    logger.info(`Server started on http://localhost:${PORT}`)
);

app.use((err, req, res, next) => {
    logger.error("Unhandled error", {
        url: req.url,
        method: req.method,
        message: err.message,
        stack: err.stack
    });

    res.status(500).json({ message: "Internal server error" });
});