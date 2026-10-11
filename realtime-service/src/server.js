require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');

const app = express();
const PORT = process.env.PORT || 6000;

app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  path: '/socket.io'
});

// Realtime Health endpoint (Required by Guidelines & Smoke Tests)
app.get('/health', (req, res) => {
  const count = (io && io.engine) ? io.engine.clientsCount : 0;
  res.status(200).json({
    status: 'ok',
    service: 'realtime-service',
    connectedClients: count,
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Internal endpoint to broadcast events from other services (e.g. resource-api)
app.post('/broadcast', (req, res) => {
  const { event, data } = req.body;

  if (!event) {
    return res.status(400).json({ error: 'Event name is required' });
  }

  const payload = {
    ...data,
    timestamp: new Date().toISOString()
  };

  // Broadcast to specific circle room if circleId is provided, else broadcast globally
  if (data && data.circleId) {
    io.to(`circle_${data.circleId}`).emit(event, payload);
  } else {
    io.emit(event, payload);
  }

  res.status(200).json({
    message: 'Event broadcasted successfully',
    event,
    connectedClients: io.engine.clientsCount
  });
});

// Socket.io connection logic
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Allow client to join circle room
  socket.on('join_circle', (circleId) => {
    if (circleId) {
      socket.join(`circle_${circleId}`);
      console.log(`Socket ${socket.id} joined circle_${circleId}`);
    }
  });

  socket.on('leave_circle', (circleId) => {
    if (circleId) {
      socket.leave(`circle_${circleId}`);
      console.log(`Socket ${socket.id} left circle_${circleId}`);
    }
  });

  socket.on('ping', () => {
    socket.emit('pong', { time: Date.now() });
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Realtime service running on port ${PORT}`);
  });
}

module.exports = { app, server, io };
