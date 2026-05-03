const passport = require("passport");
const session = require("express-session");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const logger = require("../logger");
const User = require("../models/User");

if (process.env.NODE_ENV !== "test") {
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: "/api/auth/google/callback"
    }, async (accessToken, refreshToken, profile, done) => {
        try {
            const email = profile.emails?.[0]?.value;

            logger.info("Google auth: attempt", {
                googleId: profile.id,
                email,
            });

            let user = await User.findOne({
                $or: [
                    { googleId: profile.id },
                    { email: email }
                ]
            });

            if (!user) {
                logger.warn("Google auth: failed: user not found", {
                    googleId: profile.id,
                    email,
                });
                return done(null, false, { message: "User not found" });
                return "register.html";
            }

            logger.info("Google auth: success", {
                userId: user._id,
                email: user.email,
                googleId: user.googleId,
            });

            return done(null, user);
        } catch (err) {
            logger.error("Google auth error", {
                message: err.message,
                stack: err.stack,
                googleId: profile?.id,
            });
            return done(err, null);
        }
    }));
}
 
passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);

        if (!user) {
            logger.warn("Deserialize user: not found", { id });
            return done(null, false);
        }

        done(null, user);
    } catch (err) {
        logger.error("Deserialize user: error", {
            message: err.message,
            stack: err.stack,
        });
        done(err, null);
    }
});

module.exports = passport;