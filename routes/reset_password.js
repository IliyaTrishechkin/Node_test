const express = require("express");
const router = express.Router();
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");

const logger = require("../logger");

const User = require("../models/User");
const ResetPassword = require("../models/ResetPassword");

// ================= EMAIL CONFIG =================
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// ================= FORGOT PASSWORD =================
router.post("/forgot-password", async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            logger.warn("Forgot-password: missing email", {
            ip: req.ip,
        });
            return res.status(400).json({ message: "Email required" });
        }

        logger.info("Forgot-password: request", { email });

        const user = await User.findOne({ email });

        if (!user) {
            logger.info("Forgot-password: request completed (no user)", { email });
            return res.json({ message: "If this email exists, a code was sent" });
        }

        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const hashedCode = await bcrypt.hash(code, 10);
        await ResetPassword.deleteMany({ email });

        await ResetPassword.create({
            email,
            code: hashedCode
        });

        await transporter.sendMail({
            from: `"TeenSupport" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: "Password reset",
            text: `Your password reset code: ${code}`
        });

        logger.info("Forgot-password: reset email sent", {
            email,
            provider: "gmail"
        });
        res.status(200).json({ message: "If this email exists, a code was sent" });

    } catch (err) {
        logger.error("Forgot-password: error", {
            message: err.message,
            stack: err.stack
        });
        res.status(500).json({ message: "Server error" });
    }
});

// ================= RESET PASSWORD =================
router.post("/reset-password", async (req, res) => {
    try {

        const { email, code, newPassword } = req.body;
        logger.info("Reset-password: attempt", {
            email,
            hasCode: !!code
        });

        const token = await ResetPassword.findOne({ email });

        if (!token) {
            logger.warn("Reset-password: invalid token (not found)", { email });
            return res.status(400).json({ message: "Invalid or expired code" });
        }

        const isMatch = await bcrypt.compare(code, token.code);

        if (!isMatch) {
            logger.warn("Reset-password: invalid code", { email });
            return res.status(400).json({ message: "Invalid or expired code" });
        }

        const user = await User.findOne({ email });

        if (!user) {
            logger.warn("Reset-password: user missing after valid token", { email });
            return res.status(400).json({ message: "Invalid request" });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;

        await user.save();
        await ResetPassword.deleteMany({ email });
        logger.info("Reset-password: old reset tokens cleared", { email });

        logger.info("Reset-password: successful", { email });
        res.json({ message: "Password updated successfully" });

    } catch (err) {
        logger.error("Reset-password: error", {
            message: err.message,
            stack: err.stack
        });
        res.status(500).json({ message: "Server error" });
    }
});


module.exports = router;