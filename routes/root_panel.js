const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");

const Advice = require("../models/Advice");
const Article = require("../models/Article");
const Question = require("../models/Question");


// ================= AUTH =================
const authMiddleware = (req, res, next) => {
    const token = req.cookies.token;

    if (!token) {
        return res.status(401).json({ message: "No token" });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        req.userId = decoded.id;
        req.userRole = decoded.role; // 👈 важно
        next();
    } catch (err) {
        return res.status(401).json({ message: "Invalid token" });
    }
};


// ================= ADMIN =================
const isAdmin = (req, res, next) => {
    if (req.userRole !== "admin") {
        return res.status(403).json({ message: "Admin only" });
    }
    next();
};



// ================= CREATE =================


router.post("/addQuestion", authMiddleware, isAdmin, async (req, res) => {
    try {
        const { question, answers } = req.body;

        if (!question || question.trim().length === 0) {
            return res.status(400).json({ error: "Question is required" });
        }

        if (!Array.isArray(answers) || answers.length === 0) {
            return res.status(400).json({ error: "Answers must be array" });
        }

        const doc = new Question({ question, answers });
        await doc.save();

        res.json({ message: "Question added successfully!" });

    } catch (err) {
        if (err === 11000){
            res.status(400).json({ message: "This Question already exists" });
        } else {
            console.error(err);
            res.status(500).json({ message: "Server error" });
        }
    }
});


router.post("/addArticle", authMiddleware, isAdmin, async (req, res) => {
    try {
        const { title, text } = req.body;

        if (!title || title.trim().length === 0) {
            return res.status(400).json({ error: "Title is required" });
        }

        if (!text || text.trim().length === 0) {
            return res.status(400).json({ error: "Text is required" });
        }

        const article = new Article({ title, text });
        await article.save();

        res.json({ message: "Article added successfully!" });

    } catch (err) {
        if (err === 11000){
            res.status(400).json({ message: "This Article already exists" });
        } else {
            console.error(err);
            res.status(500).json({ message: "Server error" });
        }
    }
});


router.post("/addAdvice", authMiddleware, isAdmin, async (req, res) => {
    try {
        const { title, text } = req.body;

        if (!title || title.trim().length === 0) {
            return res.status(400).json({ error: "Title is required" });
        }

        if (!text || text.trim().length === 0) {
            return res.status(400).json({ error: "Text is required" });
        }

        const advice = new Advice({ title, text });
        await advice.save();

        res.json({ message: "Advice added successfully!" });

    } catch (err) {
        if (err === 11000){
            res.status(400).json({ message: "This Advice already exists" });
        } else {
            console.error(err);
            res.status(500).json({ message: "Server error" });
        }
    }
});



// ================= GET =================

router.get("/questions", async (req, res) => {
    const data = await Question.find();
    res.json(data);
});

router.get("/articles", async (req, res) => {
    const data = await Article.find();
    res.json(data);
});

router.get("/advice", async (req, res) => {
    const data = await Advice.find();
    res.json(data);
});



// ================= UPDATE =================

router.put("/question/:id", authMiddleware, isAdmin, async (req, res) => {
    const updated = await Question.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true }
    );

    if (!updated) {
        return res.status(404).json({ message: "Not found" });
    }

    res.json(updated);
});


router.put("/article/:id", authMiddleware, isAdmin, async (req, res) => {
    const updated = await Article.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true }
    );

    if (!updated) {
        return res.status(404).json({ message: "Not found" });
    }

    res.json(updated);
});


router.put("/advice/:id", authMiddleware, isAdmin, async (req, res) => {
    const updated = await Advice.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true }
    );

    if (!updated) {
        return res.status(404).json({ message: "Not found" });
    }

    res.json(updated);
});



// ================= DELETE =================

router.delete("/question/:id", authMiddleware, isAdmin, async (req, res) => {
    const deleted = await Question.findByIdAndDelete(req.params.id);

    if (!deleted) {
        return res.status(404).json({ message: "Not found" });
    }

    res.json({ message: "Deleted" });
});


router.delete("/article/:id", authMiddleware, isAdmin, async (req, res) => {
    const deleted = await Article.findByIdAndDelete(req.params.id);

    if (!deleted) {
        return res.status(404).json({ message: "Not found" });
    }

    res.json({ message: "Deleted" });
});


router.delete("/advice/:id", authMiddleware, isAdmin, async (req, res) => {
    const deleted = await Advice.findByIdAndDelete(req.params.id);

    if (!deleted) {
        return res.status(404).json({ message: "Not found" });
    }

    res.json({ message: "Deleted" });
});


module.exports = router;