require("dotenv").config({
    path: process.env.NODE_ENV === "test"
        ? ".env.test"
        : ".env"
});
const mongoose = require("mongoose");
const app = require("./app");
const logger = require("./logger");


if (process.env.NODE_ENV !== "test") {
    mongoose.connect(process.env.MONGO_URI)
        .then(() => logger.info("MongoDB connected"))
        .catch(err => logger.error("MongoDB error", err));

    const PORT = process.env.PORT || 3000;

    app.listen(PORT, () =>
        logger.info(`Server started on http://localhost:${PORT}`)
    );
}

module.exports = app;