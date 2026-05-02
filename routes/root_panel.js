const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");

const Advice = require("../models/Advice");
const Article = require("../models/Article");
const Question = require("../models/Question");
const logger = require("../logger");


// ================= AUTH =================
const authMiddleware = (req, res, next) => {
    const token = req.cookies.token;

    if (!token) {
        logger.warn("Auth failed: no token", { ip: req.ip });
        return res.status(401).json({ message: "No token" });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        req.userId = decoded.id;
        req.userRole = decoded.role; 
        next();
    } catch (err) {
        logger.warn("Auth failed: invalid token", {
            message: err.message,
            ip: req.ip
        });
        return res.status(401).json({ message: "Invalid token" });
    }
};


// ================= ADMIN =================
const isAdmin = (req, res, next) => {
    if (req.userRole !== "admin") {
        logger.warn("IsAdmin: Forbidden access attempt", {
            userId: req.userId,
            role: req.userRole
        });
        return res.status(403).json({ message: "Admin only" });
    }
    next();
};



// ================= CREATE =================


router.post("/addQuestion", authMiddleware, isAdmin, async (req, res) => {
    try {
        const { question, answers } = req.body;
        logger.info("AddQuestion: Create question attempt");

        if (!question || question.trim().length === 0) {
            logger.warn("AddQuestion: Invalid answers input");
            return res.status(400).json({ error: "Question is required" });
        }

        if (!Array.isArray(answers) || answers.length === 0) {
            logger.warn("AddQuestion: Invalid answers input");
            return res.status(400).json({ error: "Answers must be array" });
        }

        const doc = new Question({ question, answers });
        await doc.save();

        logger.info("AddQuestion: Question created");
        res.json({ message: "Question added successfully!" });

    } catch (err) {
        logger.error("Add question error", {
            message: err.message,
            stack: err.stack
        });
        if (err.code === 11000){
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
        logger.info("AddArticle: Create article attempt");

        if (!title || title.trim().length === 0) {
            logger.warn("AddArticle: Invalid article input");
            return res.status(400).json({ error: "Title is required" });
        }

        if (!text || text.trim().length === 0) {
            return res.status(400).json({ error: "Text is required" });
        }

        const article = new Article({ title, text });
        await article.save();

        logger.info("AddArticle: Article created");
        res.json({ message: "Article added successfully!" });

    } catch (err) {
        logger.error("AddArticle: Add article error", {
            message: err.message,
            stack: err.stack
        });
        if (err.code === 11000){
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
        logger.info("AddAdvice: Create advice attempt");

        if (!title || title.trim().length === 0) {
            logger.warn("AddAdvice: Invalid advice input");
            return res.status(400).json({ error: "Title is required" });
        }

        if (!text || text.trim().length === 0) {
            logger.warn("AddAdvice: Invalid advice input");
            return res.status(400).json({ error: "Text is required" });
        }

        const advice = new Advice({ title, text });
        await advice.save();

        logger.info("AddAdvice: Advice created");
        res.json({ message: "Advice added successfully!" });

    } catch (err) {
        logger.error("AddAdvice: Add advice error", {
            message: err.message,
            stack: err.stack
        });
        if (err.code === 11000){
            res.status(400).json({ message: "This Advice already exists" });
        } else {
            console.error(err);
            res.status(500).json({ message: "Server error" });
        }
    }
});



// ================= GET =================

router.get("/questions", async (req, res) => {
    try {
        logger.info("GET-questions: Fetching questions");
        const data = await Question.find();

        logger.info("GET-questions: Questions fetched", { count: data.length });
        res.json(data);
    } catch (err) {
        logger.error("GET-questions: error", {
            message: err.message,
            stack: err.stack
        });
        res.status(500).json({ message: "Server error" });
    }
});

router.get("/articles", async (req, res) => {
    try {
        logger.info("GET-articles: Fetching articles");
        const data = await Article.find();

        logger.info("GET-articles: Articles fetched", { count: data.length });
        res.json(data);
    } catch (err) {
        logger.error("GET-articles: error", {
            message: err.message,
            stack: err.stack
        });
        res.status(500).json({ message: "Server error" });
    }
    
});

router.get("/advices", async (req, res) => {
    try {
        logger.info("GET-advices: Fetching advices");
        const data = await Advice.find();

        logger.info("GET-advices: Advices fetched");
        res.json(data);
    } catch (err) {
        logger.error("GET-advices: error", {
            message: err.message,
            stack: err.stack
        });
        res.status(500).json({ message: "Server error" });
    }
    
});



// ================= UPDATE =================

router.put("/question/:id", authMiddleware, isAdmin, async (req, res) => {
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            return res.status(400).json({ message: "No data to update" });
        }

        const updated = await Question.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );

        if (!updated) {
            return res.status(404).json({ message: "Not found" });
        }

        logger.info("Question updated:", { id: req.params.id });
        res.json(updated);
    } catch (err) {
        logger.error("Question updated: Update question error", {
            message: err.message,
            stack: err.stack
        });
        res.status(500).json({ message: "Server error" });
    }
});


router.put("/article/:id", authMiddleware, isAdmin, async (req, res) => {
    try {
        const { title, text } = req.body;

        if (!title?.trim() && !text?.trim()) {
            logger.warn("Article update: empty payload", { id: req.params.id });
            return res.status(400).json({ message: "Nothing to update" });
        }

        const updateData = {};

        if (title?.trim()) updateData.title = title.trim();
        if (text?.trim()) updateData.text = text.trim();

        const updated = await Article.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        );

        if (!updated) {
            logger.warn("Article update: Article not found", { id: req.params.id });
            return res.status(404).json({ message: "Not found" });
        }

        logger.info("Article updated:", { id: req.params.id });
        res.json(updated);
    } catch (err) {
        logger.error("Article update: Update article error", {
            message: err.message,
            stack: err.stack
        });
        res.status(500).json({ message: "Server error" });
    }
});


router.put("/advice/:id", authMiddleware, isAdmin, async (req, res) => {
    try {
        const { title, text } = req.body;

        if (!title?.trim() && !text?.trim()) {
            logger.warn("Advice update: empty payload", { id: req.params.id });
            return res.status(400).json({ message: "Nothing to update" });
        }

        const updateData = {};

        if (title?.trim()) updateData.title = title.trim();
        if (text?.trim()) updateData.text = text.trim();

        const updated = await Advice.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        );

        if (!updated) {
            logger.warn("Advice update: Advice not found", { id: req.params.id });
            return res.status(404).json({ message: "Not found" });
        }

        logger.info("Advice updated: ", { id: req.params.id });
        res.json(updated);
    } catch (err) {
        logger.error("Advice update: Update advice error", {
            message: err.message,
            stack: err.stack
        });
        res.status(500).json({ message: "Server error" });
    }
});



// ================= DELETE =================

router.delete("/question/:id", authMiddleware, isAdmin, async (req, res) => {
    try {
        const deleted = await Question.findByIdAndDelete(req.params.id);

        if (!deleted) {
            return res.status(404).json({ message: "Not found" });
        }

        logger.info("Question deleted:", { id: req.params.id });
        res.json({ message: "Deleted" });
    } catch (err) {
        logger.error("Question deleted: Delete question error", {
            message: err.message,
            stack: err.stack
        });
        res.status(500).json({ message: "Server error" });
    }
});


router.delete("/article/:id", authMiddleware, isAdmin, async (req, res) => {
    try {
        const deleted = await Article.findByIdAndDelete(req.params.id);

        if (!deleted) {
            return res.status(404).json({ message: "Not found" });
        }

        logger.info("Article deleted:", { id: req.params.id });
        res.json({ message: "Deleted" });
    } catch (err) {
        logger.error("Article deleted: Delete article error", {
            message: err.message,
            stack: err.stack
        });
        res.status(500).json({ message: "Server error" });
    }
});


router.delete("/advice/:id", authMiddleware, isAdmin, async (req, res) => {
    try {
        const deleted = await Advice.findByIdAndDelete(req.params.id);

        if (!deleted) {
            return res.status(404).json({ message: "Not found" });
        }

        logger.info("Advice deleted:", { id: req.params.id });
        res.json({ message: "Deleted" });
    } catch (err) {
        logger.error("Advice deleted: Delete advice error", {
            message: err.message,
            stack: err.stack
        });
        res.status(500).json({ message: "Server error" });
    }
});


module.exports = router;