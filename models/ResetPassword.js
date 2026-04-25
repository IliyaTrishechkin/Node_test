const mongoose = require("mongoose");

const ResetPasswordSchema = new mongoose.Schema({
    email: { type: String, required: true },
    code: { type: String, required: true },
    createdAt: { 
        type: Date, 
        default: Date.now,
        expires: 600                            // 600 s = 10 minute
    }
});

module.exports = mongoose.model("ResetPassword", ResetPasswordSchema);