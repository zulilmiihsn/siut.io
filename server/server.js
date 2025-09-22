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
//     players: { [socketId]: { id: socketId, joinedAt: number } },
//     gestures: { [socketId]: 'rock' | 'paper' | 'scissors' },
//     round: number
//   }
// }
const rooms = {};

function getRoundWinner(gestureA, gestureB) {
  if (gestureA === gestureB) return 'draw';
  const winMap = {
    rock: 'scissors',
    paper: 'rock',
    scissors: 'paper'
  };
  return winMap[gestureA] === gestureB ? 'a' : 'b';
}

io.on('connection', (socket) => {
  // Create room
  socket.on('create-room', (_, callback) => {
    const roomId = nanoid(6);
    rooms[roomId] = { players: {}, gestures: {}, round: 1 };
    socket.join(roomId);
    rooms[roomId].players[socket.id] = { id: socket.id, joinedAt: Date.now() };
    callback?.({ roomId });
    io.to(roomId).emit('room-update', { roomId, players: Object.keys(rooms[roomId].players) });
  });

  // Join room
  socket.on('join-room', ({ roomId }, callback) => {
    const room = rooms[roomId];
    if (!room) {
      callback?.({ error: 'ROOM_NOT_FOUND' });
      return;
    }
    socket.join(roomId);
    room.players[socket.id] = { id: socket.id, joinedAt: Date.now() };
    callback?.({ ok: true, roomId });
    io.to(roomId).emit('room-update', { roomId, players: Object.keys(room.players) });
  });

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
      const winnerKey = getRoundWinner(gestureA, gestureB);
      let result = { type: 'draw', winner: null };
      if (winnerKey === 'a') result = { type: 'win', winner: a };
      if (winnerKey === 'b') result = { type: 'win', winner: b };

      io.to(roomId).emit('round-result', {
        roomId,
        round: room.round,
        players: [a, b],
        gestures: { [a]: gestureA, [b]: gestureB },
        result
      });

      room.round += 1;
      room.gestures = {};
    }
  });

  socket.on('disconnecting', () => {
    const joinedRooms = Array.from(socket.rooms).filter((r) => r !== socket.id);
    joinedRooms.forEach((roomId) => {
      const room = rooms[roomId];
      if (!room) return;
      delete room.players[socket.id];
      delete room.gestures[socket.id];
      io.to(roomId).emit('room-update', { roomId, players: Object.keys(room.players) });
      // Auto clean empty rooms
      if (Object.keys(room.players).length === 0) {
        delete rooms[roomId];
      }
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


