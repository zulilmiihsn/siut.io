import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { nanoid } from 'nanoid';

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// In-memory room store
// rooms: {
//   [roomId]: {
//     id: string,
//     createdAt: number,
//     players: { [socketId]: { id: socketId, name: string, joinedAt: number } },
//     gestures: { [socketId]: 'rock' | 'paper' | 'scissors' },
//     ready: { [socketId]: boolean },
//     round: number,
//     countdownActive: boolean
//   }
// }
const rooms = {};


io.on('connection', (socket) => {
  // Lobby: list available rooms (rooms with < 2 players)
  socket.on('list-rooms', (callback) => {
    const list = Object.values(rooms)
      .map((r) => ({ id: r.id, createdAt: r.createdAt, playerCount: Object.keys(r.players).length }))
      .filter((r) => r.playerCount < 2)
      .sort((a, b) => b.createdAt - a.createdAt);
    callback?.({ rooms: list });
  });

  // Create room
  socket.on('create-room', ({ name } = {}, callback) => {
    const roomId = nanoid(6);
    rooms[roomId] = { id: roomId, createdAt: Date.now(), players: {}, gestures: {}, ready: {}, round: 1, countdownActive: false };
    socket.join(roomId);
    rooms[roomId].players[socket.id] = { id: socket.id, name: name || 'Player', joinedAt: Date.now() };
    rooms[roomId].ready[socket.id] = false;
    callback?.({ roomId });
    io.to(roomId).emit('room-update', { roomId, players: Object.values(rooms[roomId].players) });
    io.to(roomId).emit('ready-update', { roomId, ready: rooms[roomId].ready });
    io.emit('rooms-update');
  });

  // Join room
  socket.on('join-room', ({ roomId, name }, callback) => {
    const room = rooms[roomId];
    if (!room) {
      callback?.({ error: 'ROOM_NOT_FOUND' });
      return;
    }
    if (Object.keys(room.players).length >= 2) {
      callback?.({ error: 'ROOM_FULL' });
      return;
    }
    socket.join(roomId);
    room.players[socket.id] = { id: socket.id, name: name || 'Player', joinedAt: Date.now() };
    room.ready[socket.id] = false;
    callback?.({ ok: true, roomId });
    io.to(roomId).emit('room-update', { roomId, players: Object.values(room.players) });
    io.to(roomId).emit('ready-update', { roomId, ready: room.ready });
    io.emit('rooms-update');
  });

  // Player ready toggle
  socket.on('set-ready', ({ roomId, ready }) => {
    const room = rooms[roomId];
    if (!room || !room.players[socket.id]) return;
    room.ready[socket.id] = !!ready;
    io.to(roomId).emit('ready-update', { roomId, ready: room.ready });
    
    const playerIds = Object.keys(room.players);
    const allReady = playerIds.length >= 2 && playerIds.every((id) => room.ready[id]);
    
    if (allReady && !room.countdownActive) {
      // Start countdown when all players are ready
      startCountdown(roomId);
    }
  });

  // Start game countdown
  socket.on('start-game', ({ roomId }) => {
    const room = rooms[roomId];
    if (!room) return;
    
    const playerIds = Object.keys(room.players);
    const allReady = playerIds.length >= 2 && playerIds.every((id) => room.ready[id]);
    
    if (allReady && !room.countdownActive) {
      startCountdown(roomId);
    }
  });

  // Countdown function
  function startCountdown(roomId) {
    const room = rooms[roomId];
    if (!room || room.countdownActive) return;
    
    room.countdownActive = true;
    let countdown = 3;
    
    // Send initial countdown
    io.to(roomId).emit('countdown-start', { roomId, countdown });
    
    const countdownInterval = setInterval(() => {
      countdown--;
      if (countdown > 0) {
        io.to(roomId).emit('countdown-start', { roomId, countdown });
      } else {
        // Countdown finished, start game
        clearInterval(countdownInterval);
        room.countdownActive = false;
        room.gestures = {};
        io.to(roomId).emit('game-start-countdown', { roomId });
        io.to(roomId).emit('round-start', { roomId, round: room.round });
      }
    }, 1000);
  }

  // Submit gesture
  socket.on('submit-gesture', ({ roomId, gesture }) => {
    const room = rooms[roomId];
    if (!room) return;
    room.gestures[socket.id] = gesture; // 'rock' | 'paper' | 'scissors'

    const playerIds = Object.keys(room.players);
    const submittedIds = Object.keys(room.gestures);

    // If at least two players and first two submitted, resolve round
    if (playerIds.length >= 2 && submittedIds.length >= 2) {
      const [a, b] = submittedIds.slice(0, 2);
      const gestureA = room.gestures[a];
      const gestureB = room.gestures[b];
      // Determine winner
      let result = { type: 'draw', winner: null };
      if (gestureA !== gestureB) {
        const winMap = {
          rock: 'scissors',
          paper: 'rock',
          scissors: 'paper'
        };
        if (winMap[gestureA] === gestureB) {
          result = { type: 'win', winner: a };
        } else {
          result = { type: 'win', winner: b };
        }
      }

      io.to(roomId).emit('round-result', {
        roomId,
        round: room.round,
        players: [a, b],
        gestures: { [a]: gestureA, [b]: gestureB },
        result
      });

      room.round += 1;
      room.gestures = {};
      // Reset ready for next round
      Object.keys(room.ready).forEach((id) => (room.ready[id] = false));
      io.to(roomId).emit('ready-update', { roomId, ready: room.ready });
    }
  });

  socket.on('disconnecting', () => {
    const joinedRooms = Array.from(socket.rooms).filter((r) => r !== socket.id);
    joinedRooms.forEach((roomId) => {
      const room = rooms[roomId];
      if (!room) return;
      delete room.players[socket.id];
      delete room.gestures[socket.id];
      if (room.ready) delete room.ready[socket.id];
      io.to(roomId).emit('room-update', { roomId, players: Object.values(room.players) });
      io.to(roomId).emit('ready-update', { roomId, ready: room.ready });
      // Auto clean empty rooms
      if (Object.keys(room.players).length === 0) {
        delete rooms[roomId];
      }
      io.emit('rooms-update');
    });
  });
});

app.get('/', (_req, res) => {
  res.json({ status: 'ok', service: 'rps-gesture-server' });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Socket.io server listening on http://localhost:${PORT}`);
});
