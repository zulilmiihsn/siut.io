import { io } from 'socket.io-client'

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000'

export const socket = io(SERVER_URL, {
  autoConnect: true,
  transports: ['websocket']
})


