const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema({
    question: { type: String, required: true, unique: true},    // Data and for search and show
    answers: [{ type: String, required: true }]                 // .append({myanswer: "Моя відповідь"});
});

module.exports = mongoose.model("Question", questionSchema);