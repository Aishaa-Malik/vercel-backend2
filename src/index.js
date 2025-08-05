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

// Start server
app.listen(config.port, () => {
  console.log(`Server is running on port ${config.port}`);
});