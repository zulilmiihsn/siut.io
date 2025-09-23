import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import CameraFeed from '../components/CameraFeed.jsx'
import { socket } from '../utils/socket.js'
import { Users, Timer, Trophy, CheckCircle2 } from 'lucide-react'

export default function GameRoom() {
  const { roomId } = useParams()
  const [players, setPlayers] = useState([])
  const [result, setResult] = useState(null)
  const [countdown, setCountdown] = useState(0)
  const [readyMap, setReadyMap] = useState({})
  const [isReady, setIsReady] = useState(false)
  const [gameStarted, setGameStarted] = useState(false)

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
    const onStart = (payload) => {
      if (payload.roomId === roomId) {
        setResult(null)
        setCountdown(0)
        setGameStarted(false)
      }
    }
    const onCountdown = (payload) => {
      if (payload.roomId === roomId) {
        setCountdown(payload.countdown)
        setGameStarted(false)
      }
    }
    const onGameStart = (payload) => {
      if (payload.roomId === roomId) {
        setCountdown(0)
        setGameStarted(true)
      }
    }
    const onReady = (payload) => {
      if (payload.roomId === roomId) setReadyMap(payload.ready || {})
    }
    socket.on('room-update', onUpdate)
    socket.on('round-result', onRound)
    socket.on('game-start', onStart)
    socket.on('round-start', onStart)
    socket.on('countdown-start', onCountdown)
    socket.on('game-start-countdown', onGameStart)
    socket.on('ready-update', onReady)

    return () => {
      socket.off('room-update', onUpdate)
      socket.off('round-result', onRound)
      socket.off('game-start', onStart)
      socket.off('round-start', onStart)
      socket.off('countdown-start', onCountdown)
      socket.off('game-start-countdown', onGameStart)
      socket.off('ready-update', onReady)
    }
  }, [roomId])

  // Countdown is now handled by server

  function toggleReady() {
    const next = !isReady
    setIsReady(next)
    socket.emit('set-ready', { roomId, ready: next })
  }

  // Check if all players are ready
  const canStartGame = players.length >= 2 && players.every(p => readyMap[p.id]) && !gameStarted && countdown === 0

  const winnerText = (() => {
    if (!result) return '—'
    if (result.result.type === 'draw') return 'Seri'
    return result.result.winner === socket.id ? 'Kamu Menang!' : 'Kamu Kalah'
  })()

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 fade-in">
      <section className="panel p-4 md:p-6 order-2 lg:order-1">
        <div className="flex items-center justify-between mb-3 md:mb-4">
          <h2 className="text-lg md:text-xl font-semibold">Room: {roomId}</h2>
          <span className="badge text-xs"><Users className="w-3 h-3 md:w-4 md:h-4"/> {players.length} pemain</span>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 md:gap-4 mb-4">
          <div className="text-3xl md:text-5xl font-bold flex items-center">
            <Timer className="inline w-6 h-6 md:w-8 md:h-8 mr-2" />
            {countdown > 0 ? countdown : gameStarted ? 'GAME!' : '—'}
          </div>
          <div className="flex gap-2 md:gap-3">
            {canStartGame && (
              <button 
                className="btn-primary text-sm md:text-base" 
                onClick={() => socket.emit('start-game', { roomId })}
              >
                <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5"/> Mulai Game
              </button>
            )}
            <button className={`btn-glass text-sm md:text-base ${isReady ? 'opacity-80' : ''}`} onClick={toggleReady}>
              <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5"/> {isReady ? 'Ready' : 'Siap'}
            </button>
          </div>
        </div>
        <div className="mb-4">
          <p className="text-slate-200 flex items-center gap-2 text-sm md:text-base"><Trophy className="w-4 h-4 md:w-5 md:h-5 text-amber-400"/> Hasil: <span className="font-semibold">{winnerText}</span></p>
        </div>
        <div className="text-xs md:text-sm text-slate-300">
          <div className="mb-2">Status pemain siap:</div>
          <ul className="list-disc ml-4 space-y-1">
            {players.map((p) => (
              <li key={p.id}>{p.id === socket.id ? 'Kamu' : p.id.slice(0,6)}: {readyMap[p.id] ? 'Ready' : 'Belum'}</li>
            ))}
          </ul>
        </div>
      </section>
      <section className="panel p-2 md:p-4 order-1 lg:order-2">
        <CameraFeed roomId={roomId} countdown={countdown} />
      </section>
    </div>
  )
}


