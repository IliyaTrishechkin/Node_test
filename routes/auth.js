const express = require("express");
const session = require("express-session");
const passport = require("passport");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

const logger = require("../logger");

const User = require("../models/User");
const Registration = require("../models/Registration");

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});


// Token verification middleware
const authMiddleware = (req, res, next) => {
    const token = req.cookies.token;

    if (!token) {
        logger.warn("authMiddleware: Auth failed: no token", { ip: req.ip });
        return res.status(401).json({ message: "No token provided" });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.id;
        req.userRole = decoded.role;
        logger.info("authMiddleware: Auth success", { userId: decoded.id });
        next();
    } catch (err) {
        logger.warn("authMiddleware: Auth token error", {
            name: err.name,
            message: err.message,
            ip: req.ip
        });
        if (err.name === "TokenExpiredError") {
            return res.status(401).json({ message: "Token expired" });
        }
        return res.status(401).json({ message: "Invalid token" });
    }
};


// Registration (send code)
router.post("/register", async (req, res) => {
    try {
        const { name, email, password } = req.body;
        logger.info("register: Register attempt", { email });

        const exist = await User.findOne({ email });
        if (exist) {
            logger.warn("register: Register failed: user exists", { email });
            return res.status(400).json({ message: "User already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const hashedCode = await bcrypt.hash(code, 5);

        await Registration.deleteMany({ email });

        await Registration.create({
            name,
            email,
            password: hashedPassword,
            code: hashedCode
        });

        if (process.env.NODE_ENV === "test") {
            logger.info("register: TEST MODE - skip email", { email });

            return res.json({
                message: "Code sent to email",
                testCode: code // только для тестов
            });
        }

        await transporter.sendMail({
            from: `"TeenSupport" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: "Confirm registration",
            text: `Your confirmation code: ${code}`
        });

        logger.info("register: Register code sent", { email });
        res.json({ message: "Code sent to email" });

    } catch (err) {
        logger.error("register: Register error", {
            email: req.body?.email,
            message: err.message,
            stack: err.stack
        });
        res.status(500).json({ message: "Server error" });
    }
});


// Confirm registration
router.post("/register-confirm", async (req, res) => {
    try {
        const { email, code } = req.body;
        logger.info("register-confirm: Register confirm attempt", { email });

        const record = await Registration.findOne({ email });

        if (!record) {
            logger.warn("register-confirm: Register confirm failed: no record", { email });
            return res.status(400).json({ message: "Invalid or expired code" });
        }

        const isMatch = await bcrypt.compare(code, record.code);

        if (!isMatch) {
            logger.warn("register-confirm: Register confirm failed: wrong code", { email });
            return res.status(400).json({ message: "Invalid or expired code" });
        }

        const user = new User({
            name: record.name,
            email: record.email,
            password: record.password
        });

        await user.save();
        await Registration.deleteMany({ email });

        logger.info("register-confirm: User registered successfully", { email });
        res.json({ message: "Registration successful!" });

    } catch (err) {
        logger.error("register-confirm: Register confirm error", {
            email: req.body?.email,
            message: err.message,
            stack: err.stack
        });
        res.status(500).json({ message: "Server error" });
    }
});


// Login
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        logger.info("login: Login attempt", { email });


        const user = await User.findOne({ email });
        if (!user) {
            logger.warn("login: Login failed: user not found", { email });
            return res.status(400).json({ message: "Invalid email or password" });
        }

        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            logger.warn("login: Login failed: wrong password", { email });
            return res.status(400).json({ message: "Invalid email or password" });
        }

        const token = jwt.sign(
            {
                id: user._id,
                role: user.role
            },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );

        res.cookie("token", token, {
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production" // set true if using HTTPS
        });

        logger.info("Login success", { userId: user._id, email });
        res.json({ message: "login: Login successful!" });

    } catch (err) {
        logger.error("login: Login error", {
            email: req.body?.email,
            message: err.message,
            stack: err.stack
        });
        res.status(500).json({ message: "Server error" });
    }
});


// Google OAuth routes
router.get("/google",
    passport.authenticate("google", {
        scope: ["profile", "email"]
    })
);

router.get("/google/callback",
    passport.authenticate("google", {
        failureRedirect: "/register.html?msg=User+not+found"
    }),
    (req, res) => {

        const token = jwt.sign(
            { id: req.user._id },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );

        res.cookie("token", token, {
            httpOnly: true,
            sameSite: "lax",
            secure: false
        });

        logger.info("Google login success", { userId: req.user._id });
        res.redirect("/user.html");
    }
);




// Get current user
router.get("/me", authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.userId).select("-password");

        if (!user) {
            logger.warn("me: User not found in /me", { userId: req.userId });
            return res.status(404).json({ message: "User not found" });
        }

        res.json(user);

    } catch (err) {
        logger.error("me: Get user error", {
            userId: req.userId,
            message: err.message,
            stack: err.stack
        });
        res.status(500).json({ message: "Server error" });
    }
});


// Logout
router.post("/logout", (req, res) => {
    res.clearCookie("token");

    logger.info("logout: User logout", { ip: req.ip });
    res.json({ message: "Logged out" });
});


module.exports = router;
module.exports.authMiddleware = authMiddleware;