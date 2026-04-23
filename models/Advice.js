const mongoose = require("mongoose");

const adviceSchema = new mongoose.Schema({
    title: { type: String, required: true, unique: true},   // For search and show
    text: { type: String, required: true}                   // Data
});

module.exports = mongoose.model("Advice", adviceSchema);
