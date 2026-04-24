const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema({
    question: { type: String, required: true, unique: true},    // Data and for search and show
    answers: [{ type: String, required: true }],                // .append({myanswer: "Моя відповідь"});

    allowCustom: { type: Boolean, default: false } // Allows users to add their own answers
});

module.exports = mongoose.model("Question", questionSchema);
