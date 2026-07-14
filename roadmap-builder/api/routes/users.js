const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const router = express.Router();

function getUserIdFromRequest(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader) return null;

    const token = authHeader.split(" ")[1];
    if (!token) return null;

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "dev-secret");
        return decoded.id;
    } catch {
        return null;
    }
}

function safeUser(user) {
    return {
        id: user._id,
        name: user.name,
        email: user.email,
        isVerified: user.isVerified,
        gender: user.gender,
        bio: user.bio,
        occupation: user.occupation,
        careerGoal: user.careerGoal,
        location: user.location,
        avatarUrl: user.avatarUrl,
    };
}

// GET /api/users/profile
router.get("/profile", async (req, res) => {
    try {
        const userId = getUserIdFromRequest(req);
        if (!userId) {
            return res.status(401).json({ error: "You must be logged in." });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: "User not found." });
        }

        res.json({ user: safeUser(user) });
    } catch (err) {
        console.error("GET PROFILE ERROR:", err);
        res.status(500).json({ error: "Could not load profile." });
    }
});

// PATCH /api/users/profile
router.patch("/profile", async (req, res) => {
    try {
        const userId = getUserIdFromRequest(req);
        if (!userId) {
            return res.status(401).json({ error: "You must be logged in." });
        }

        const { name, bio, occupation, careerGoal, location, gender, avatarUrl } = req.body;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: "User not found." });
        }

        if (name !== undefined) user.name = name;
        if (bio !== undefined) user.bio = bio;
        if (occupation !== undefined) user.occupation = occupation;
        if (careerGoal !== undefined) user.careerGoal = careerGoal;
        if (location !== undefined) user.location = location;
        if (gender !== undefined) user.gender = gender;
        if (avatarUrl !== undefined) user.avatarUrl = avatarUrl;

        await user.save();

        res.json({ user: safeUser(user) });
    } catch (err) {
        console.error("UPDATE PROFILE ERROR:", err);
        res.status(500).json({ error: "Could not save profile." });
    }
});

module.exports = router;