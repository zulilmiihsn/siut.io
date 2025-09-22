import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import CameraFeed from '../components/CameraFeed.jsx'
import { socket } from '../utils/socket.js'
import { Users, Timer, Trophy } from 'lucide-react'

export default function GameRoom() {
  const { roomId } = useParams()
  const [players, setPlayers] = useState([])
  const [result, setResult] = useState(null)
  const [countdown, setCountdown] = useState(3)
  const countdownRef = useRef(null)

  useEffect(() => {
    if (!roomId) return
    socket.emit('join-room', { roomId }, (resp) => {
      // no-op
    })

    const onUpdate = (payload) => {
      if (payload.roomId === roomId) setPlayers(payload.players)
    }
    const onRound = (payload) => {
      if (payload.roomId === roomId) setResult(payload)
    }
    socket.on('room-update', onUpdate)
    socket.on('round-result', onRound)

    return () => {
      socket.off('room-update', onUpdate)
      socket.off('round-result', onRound)
    }
  }, [roomId])

  useEffect(() => {
    startCountdown()
    return () => stopCountdown()
  }, [])

  function startCountdown() {
    setCountdown(3)
    stopCountdown()
    countdownRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(countdownRef.current)
          return 0
        }
        return c - 1
      })
    }, 1000)
  }
  function stopCountdown() {
    if (countdownRef.current) clearInterval(countdownRef.current)
  }

  const winnerText = useMemo(() => {
    if (!result) return '—'
    if (result.result.type === 'draw') return 'Seri'
    return result.result.winner === socket.id ? 'Kamu Menang!' : 'Kamu Kalah'
  }, [result])

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <section className="panel p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Room: {roomId}</h2>
          <span className="badge"><Users className="w-4 h-4"/> {players.length} pemain</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-5xl font-bold"><Timer className="inline w-8 h-8 mr-2" />{countdown}</div>
          <button className="btn-glass" onClick={startCountdown}>Reset Countdown</button>
        </div>
        <div className="mt-4">
          <p className="text-slate-200 flex items-center gap-2"><Trophy className="w-5 h-5 text-amber-400"/> Hasil: <span className="font-semibold">{winnerText}</span></p>
        </div>
      </section>
      <section className="panel p-2">
        <CameraFeed roomId={roomId} countdown={countdown} />
      </section>
    </div>
  )
}


