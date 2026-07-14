// Simple Express server for RoadMap Builder.
// Kept deliberately minimal: connect to MongoDB, mount a few route
// files, done. No extra middleware layers or abstractions.
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./db");

const authRoutes = require("./routes/auth");
const roadmapRoutes = require("./routes/roadmap");
const aiRoutes = require("./routes/ai");
const taskRoutes = require("./routes/tasks");
const userRoutes = require("./routes/users");


const app = express();

app.use(cors({ origin: process.env.CLIENT_ORIGIN || "*" }));
app.use(express.json());
app.use("/api/users", userRoutes);

// Health check works even without a database configured yet -
// useful for confirming the server itself is running.
app.get("/api/health", (req, res) => res.json({ status: "ok" }));

// Make sure the DB is connected before handling any other requests.
// (mongoose.connect resolves instantly on repeat calls once connected,
// which matters for serverless environments like Vercel.)
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    res.status(500).json({ error: "Database connection failed. Check your MONGODB_URI." });
  }
});
console.log("auth routes loaded");
app.use("/api/auth", authRoutes);
app.use("/api/roadmap", roadmapRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/tasks", taskRoutes);

app.use("/api/focus", require("./routes/focus"));
app.use("/api/achievements", require("./routes/achievements"));

// Fallback error handler so the API never leaks raw stack traces.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Something went wrong on the server." });
});

const PORT = process.env.PORT || 5000;

// Only listen on a port when run directly (local dev).
// On Vercel, the exported app is used as a serverless function instead.
if (require.main === module) {
  app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
}

module.exports = app;
