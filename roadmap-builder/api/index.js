const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors({
    origin: [
        'http://localhost:5173', // For local development
        'https://rhodes-roadmap-builder.vercel.app/' // Your actual live Vercel production domain
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

// Ensure your routes are defined AFTER cors middleware
