const express = require("express");
const router = express.Router();
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");

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

        const user = await User.findOne({ email });

        if (!user) {
            return res.json({ message: "If this email exists, a code was sent" });
        }

        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const hashedCode = await bcrypt.hash(code, 5);
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

        res.json({ message: "If this email exists, a code was sent" });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

// ================= RESET PASSWORD =================
router.post("/reset-password", async (req, res) => {
    try {

        const { email, code, newPassword } = req.body;

        const token = await ResetPassword.findOne({ email });

        if (!token) {
            return res.status(400).json({ message: "Invalid or expired code" });
        }

        const isMatch = await bcrypt.compare(code, token.code);

        if (!isMatch) {
            return res.status(400).json({ message: "Invalid or expired code" });
        }

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({ message: "Invalid request" });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;

        await user.save();
        await ResetPassword.deleteMany({ email });

        res.json({ message: "Password updated successfully" });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});


module.exports = router;