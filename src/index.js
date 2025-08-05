const express = require('express');
const cors = require('cors');
const config = require('./config');
const paymentRoutes = require('./routes/payment');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api', paymentRoutes);

// Basic route for testing
app.get('/', (req, res) => {
  res.send('HealthConnect API is running');
});

// For Vercel, we export the Express app instead of starting the server directly
if (process.env.NODE_ENV === 'production') {
  // Export app for Vercel serverless function
  module.exports = app;
} else {
  // Start server for local development
  app.listen(config.port, () => {
    console.log(`Server is running on port ${config.port}`);
  });
}