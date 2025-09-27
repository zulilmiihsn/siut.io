import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { socket } from '../utils/socket.js'
import { PlusCircle, LogIn, Users } from 'lucide-react'

export default function RoomControls() {
  const [name, setName] = useState('')
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    fetchRooms()
    const onRoomsUpdate = () => fetchRooms()
    socket.on('rooms-update', onRoomsUpdate)
    return () => socket.off('rooms-update', onRoomsUpdate)
  }, [])

  function fetchRooms() {
    socket.emit('list-rooms', (resp) => {
      setRooms(resp?.rooms || [])
    })
  }

  function createRoom() {
    setLoading(true)
    socket.emit('create-room', { name }, ({ roomId }) => {
      setLoading(false)
      if (roomId) navigate(`/room/${roomId}`)
    })
  }

  function joinRoom(roomId) {
    if (!roomId || !name) return
    setLoading(true)
    socket.emit('join-room', { roomId, name }, (resp) => {
      setLoading(false)
      if (resp?.ok) navigate(`/room/${roomId}`)
      else alert('Room tidak ditemukan atau penuh')
    })
  }

  return (
    <div className="grid gap-4 md:gap-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4 items-end">
        <div>
          <label className="block text-xs md:text-sm text-slate-300 mb-1">Nama Kamu</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && name) createRoom() }}
            placeholder="Masukin nama kamu dong"
            className="w-full h-10 md:h-12 px-3 md:px-4 bg-slate-900/60 border border-slate-700 rounded-lg md:rounded-xl focusable text-sm md:text-base"
          />
        </div>
        <div className="flex gap-2 md:gap-3">
          <button onClick={createRoom} disabled={loading || !name} className="btn-primary disabled:opacity-50 focusable h-10 md:h-12 text-sm md:text-base flex-1"><PlusCircle className="w-4 h-4 md:w-5 md:h-5"/> <span className="hidden sm:inline">Bikin Room Baru</span><span className="sm:hidden">Bikin Room</span></button>
          <button onClick={fetchRooms} className="btn-glass h-10 md:h-12 focusable text-sm md:text-base"><span className="hidden sm:inline">Refresh</span><span className="sm:hidden">↻</span></button>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3 md:mb-4">
          <h3 className="section-title text-sm md:text-base">Room yang Ada</h3>
          <span className="badge text-xs">{rooms.length} room</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
          {rooms.map((r) => (
            <button 
              key={r.id} 
              className={`panel p-4 md:p-5 text-left transition focusable group ${
                loading || !name || r.playerCount >= 2 
                  ? 'opacity-50 cursor-not-allowed' 
                  : 'hover:bg-white/10'
              }`}
              onClick={() => joinRoom(r.id)}
              disabled={loading || !name || r.playerCount >= 2}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="font-semibold tracking-wide text-sm md:text-base">{r.id}</div>
                <div className="flex items-center gap-1">
                  <Users className="w-3 h-3 md:w-4 md:h-4 text-slate-400"/>
                  <span className="text-xs text-slate-400">{r.playerCount}/2</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className={`text-xs ${
                  r.playerCount >= 2 ? 'text-red-400' : 
                  r.playerCount === 1 ? 'text-yellow-400' : 
                  'text-green-400'
                }`}>
                  {r.playerCount >= 2 ? 'Penuh' : r.playerCount === 1 ? 'Tunggu temen' : 'Kosong'}
                </span>
                <LogIn className={`w-4 h-4 md:w-5 md:h-5 transition ${
                  loading || !name || r.playerCount >= 2 
                    ? 'text-slate-500' 
                    : 'text-slate-400 group-hover:text-sky-400'
                }`} />
              </div>
            </button>
          ))}
          {rooms.length === 0 && (
              <div className="text-slate-400 text-xs md:text-sm col-span-full text-center py-8">
              <div className="mb-2">Belum ada room nih</div>
              <div className="text-slate-500">Bikin room baru dulu yuk!</div>
            </div>
          )}
        </div>
        {!name && (
          <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-50 px-4 py-2 bg-amber-500/90 backdrop-blur-sm border border-amber-400 rounded-full text-amber-900 text-xs font-medium shadow-lg animate-pulse">
            ⚠️ Masukin nama dulu
          </div>
        )}
      </div>
    </div>
  )
}


