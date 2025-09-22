import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { socket } from '../utils/socket.js'
import { PlusCircle, LogIn } from 'lucide-react'

export default function RoomControls() {
  const [roomCode, setRoomCode] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  function createRoom() {
    setLoading(true)
    socket.emit('create-room', null, ({ roomId }) => {
      setLoading(false)
      if (roomId) navigate(`/room/${roomId}`)
    })
  }

  function joinRoom() {
    if (!roomCode) return
    setLoading(true)
    socket.emit('join-room', { roomId: roomCode }, (resp) => {
      setLoading(false)
      if (resp?.ok) navigate(`/room/${roomCode}`)
      else alert('Room tidak ditemukan')
    })
  }

  return (
    <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
      <button onClick={createRoom} disabled={loading} className="btn-primary disabled:opacity-50"><PlusCircle className="w-5 h-5"/> Buat Room</button>
      <div className="flex-1">
        <label className="block text-sm text-slate-300 mb-1">Kode Room</label>
        <input value={roomCode} onChange={(e) => setRoomCode(e.target.value)} placeholder="Masukkan kode" className="w-full px-3 py-3 bg-slate-900/60 border border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-sky-600" />
      </div>
      <button onClick={joinRoom} disabled={loading} className="btn-glass disabled:opacity-50"><LogIn className="w-5 h-5"/> Gabung</button>
    </div>
  )
}


