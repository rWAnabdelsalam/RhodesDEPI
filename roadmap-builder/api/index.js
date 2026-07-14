const express = require('express');
const app = express();

// Your api health endpoint structure
app.get('/api/health', (req, res) => {
    res.json({ status: "ok", timestamp: new Date() });
});

// ... your authentication routers / verify-email endpoints go here ...

// Only listen when running locally, skip it on Vercel
if (process.env.NODE_ENV !== 'production') {
    app.listen(5000, () => console.log('Running locally on port 5000'));
}

// CRUCIAL FOR VERCEL TO ROUTE TRAFFIC TO EXPRESS
module.exports = app;
