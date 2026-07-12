const mongoose = require("mongoose");

// A notification is stored right on the task it's about, so "have you
// finished?" nudges and deadline reminders live next to the thing they refer
// to and can be shown in the Notifications page with zero extra lookups.
const notificationSchema = new mongoose.Schema(
    {
        title: { type: String, required: true },
        message: { type: String, required: true },
        type: {
            type: String,
            enum: ["info", "warning", "success"],
            default: "info",
        },
        createdAt: { type: Date, default: Date.now },
    },
    { _id: true }
);

const taskSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },

        roadmap: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Roadmap",
        },

        phaseId: {
            type: mongoose.Schema.Types.ObjectId,
        },

        lessonIndex: {
            type: Number,
        },

        sourceLessonKey: {
            type: String,
            index: true,
        },

        weekKey: {
            type: String,
            index: true,
        },

        taskType: {
            type: String,
            enum: ["manual", "weekly-lesson"],
            default: "manual",
        },

        title: {
            type: String,
            required: true,
        },

        description: String,

        duration: {
            type: Number,
            default: 25,
        },

        completed: {
            type: Boolean,
            default: false,
        },

        completedAt: Date,

        status: {
            type: String,
            enum: ["todo", "in-progress", "done"],
            default: "todo",
        },

        priority: {
            type: String,
            enum: ["low", "medium", "high"],
            default: "medium",
        },

        category: {
            type: String,
            default: "Learning",
        },

        // The task's deadline. NOT auto-defaulted to "now" — a task with no
        // deadline is just a plain checklist item and should never trigger
        // deadline reminders. Weekly roadmap-lesson tasks always set this
        // explicitly to the current week's end date.
        dueDate: {
            type: Date,
            default: null,
        },

        // --- "Start Task" timer state (manual tasks only) ---
        // Set the moment the learner presses "Start Task". Checked lazily
        // (whenever tasks are fetched) against `duration` to see if the timer
        // has run out — no background jobs/cron needed.
        activeStartedAt: {
            type: Date,
            default: null,
        },

        // True once the timer has run out and we're waiting on the learner to
        // say whether they actually finished. Drives the "Did you finish?"
        // prompt in the UI.
        awaitingConfirmation: {
            type: Boolean,
            default: false,
        },

        // Throttles deadline reminders so we don't re-notify on every page
        // load — see reminderCadenceMs() in routes/tasks.js.
        lastNotifiedAt: {
            type: Date,
            default: null,
        },

        notifications: {
            type: [notificationSchema],
            default: [],
        },
    },
    { timestamps: true }
);

taskSchema.index({
    user: 1,
    sourceLessonKey: 1,
    completed: 1,
});

taskSchema.index({
    user: 1,
    weekKey: 1,
    taskType: 1,
});

module.exports = mongoose.model("Task", taskSchema);