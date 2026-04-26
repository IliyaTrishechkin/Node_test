const express = require("express");
const session = require("express-session");
const passport = require("passport");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

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
        return res.status(401).json({ message: "No token provided" });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.id;
        next();
    } catch (err) {
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

        const exist = await User.findOne({ email });
        if (exist) {
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

        await transporter.sendMail({
            from: `"TeenSupport" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: "Confirm registration",
            text: `Your confirmation code: ${code}`
        });

        res.json({ message: "Code sent to email" });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});


// Confirm registration
router.post("/register-confirm", async (req, res) => {
    try {
        const { email, code } = req.body;

        const record = await Registration.findOne({ email });

        if (!record) {
            return res.status(400).json({ message: "Invalid or expired code" });
        }

        const isMatch = await bcrypt.compare(code, record.code);

        if (!isMatch) {
            return res.status(400).json({ message: "Invalid or expired code" });
        }

        const user = new User({
            name: record.name,
            email: record.email,
            password: record.password
        });

        await user.save();
        await Registration.deleteMany({ email });

        res.json({ message: "Registration successful!" });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});


// Login
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "Invalid email or password" });
        }

        const match = await bcrypt.compare(password, user.password);
        if (!match) {
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
            secure: true // set true if using HTTPS
        });

        res.json({ message: "Login successful!" });

    } catch (err) {
        console.error(err);
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

        res.redirect("/user.html");
    }
);




// Get current user
router.get("/me", authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.userId).select("-password");

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.json(user);

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});


// Logout
router.post("/logout", (req, res) => {
    res.clearCookie("token");
    res.json({ message: "Logged out" });
});


module.exports = router;
