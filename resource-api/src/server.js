require('dotenv').config();
const express = require('express');
const cors = require('cors');
const resourceRoutes = require('./routes');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'resource-api',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

app.use('/', resourceRoutes);

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Resource API running on port ${PORT}`);
  });
}

module.exports = app;
