const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true
        },

        passwordHash: {
            type: String,
            required: true
        },

        skillLevel: {
            type: String,
            default: "beginner"
        },

        isVerified: {
            type: Boolean,
            default: false
        },

        verificationCode: {
            type: String,
        },

        verificationCodeExpires: {
            type: Date,
        },

        resetPasswordCode: {
            type: String,
        },

        resetPasswordExpires: {
            type: Date,
        },
        gender: {
            type: String,
            enum: ["female", "male", "prefer-not-to-say"],
            default: "prefer-not-to-say",
        },

        birthdate: {
            type: Date,
            default: null,
        },
        bio: {
            type: String,
            default: "",
        },

        occupation: {
            type: String,
            default: "",
        },

        careerGoal: {
            type: String,
            default: "",
        },

        location: {
            type: String,
            default: "",
        },

        avatarUrl: {
            type: String,
            default: "",
        },
    },

    { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);