const mongoose = require("mongoose");

const RegisterSchema = new mongoose.Schema({
    name: String,
    email: String,
    password: String,
    code: String,

    createdAt: {
        type: Date,
        default: Date.now,
        expires: 600                            // 600 секунд = 10 минут
    }
});

module.exports = mongoose.model("Registration", RegisterSchema);