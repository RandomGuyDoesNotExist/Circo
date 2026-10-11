require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Direct root health endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'auth-api',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Auth & profile routes
app.use('/', authRoutes);

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Auth API running on port ${PORT}`);
  });
}

module.exports = app;
